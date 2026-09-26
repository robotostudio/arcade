type Song = { bpm: number; notes: readonly number[]; bass: readonly number[]; thirds: readonly number[] }

// Original 32-bar house arrangements. All sources and their effects belong to one
// disposable engine, so pausing or changing records cannot leave an echo behind.
export function createDroidSynth(context: AudioContext, song: Song, track: number, volume: number) {
  const master = context.createGain()
  master.gain.value = volume * .3
  const mix = context.createGain()
  const compressor = context.createDynamicsCompressor()
  compressor.threshold.value = -18; compressor.ratio.value = 3
  const analyser = context.createAnalyser()
  analyser.fftSize = 512; analyser.smoothingTimeConstant = .65
  mix.connect(compressor); compressor.connect(master); master.connect(analyser); analyser.connect(context.destination)

  const echo = context.createDelay(1), feedback = context.createGain(), wet = context.createGain()
  const echoFilter = context.createBiquadFilter()
  echo.delayTime.value = 60 / song.bpm * .75
  feedback.gain.value = .26; wet.gain.value = .19
  echoFilter.type = 'lowpass'; echoFilter.frequency.value = 2200
  echo.connect(echoFilter); echoFilter.connect(feedback); feedback.connect(echo)
  echoFilter.connect(wet); wet.connect(mix)
  const voices = new Set<AudioScheduledSourceNode>()
  const noise = context.createBuffer(1, context.sampleRate * .4, context.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const hz = (note: number) => 440 * 2 ** ((note - 69) / 12)
  const own = (source: AudioScheduledSourceNode, nodes: AudioNode[], time: number, duration: number) => {
    voices.add(source)
    source.onended = () => { voices.delete(source); source.disconnect(); nodes.forEach(node => node.disconnect()) }
    source.start(time); source.stop(time + duration + .03)
  }
  const note = (midi: number, time: number, duration: number, type: OscillatorType, level: number, pan = 0, slide = 1, delay = false) => {
    const source = context.createOscillator(), envelope = context.createGain(), filter = context.createBiquadFilter(), stereo = context.createStereoPanner()
    source.type = type; source.frequency.setValueAtTime(hz(midi), time)
    if (slide !== 1) source.frequency.exponentialRampToValueAtTime(hz(midi) * slide, time + duration * .8)
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(type === 'sawtooth' ? 2600 : 4800, time)
    filter.frequency.exponentialRampToValueAtTime(type === 'sawtooth' ? 380 : 1800, time + duration)
    envelope.gain.setValueAtTime(0, time)
    envelope.gain.linearRampToValueAtTime(level, time + Math.min(.025, duration / 4))
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration)
    stereo.pan.value = pan
    source.connect(filter); filter.connect(envelope); envelope.connect(stereo); stereo.connect(mix)
    if (delay) stereo.connect(echo)
    own(source, [filter, envelope, stereo], time, duration)
  }
  const percussion = (time: number, snare: boolean) => {
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), envelope = context.createGain()
    source.buffer = noise; filter.type = 'highpass'; filter.frequency.value = snare ? 1400 : 7500
    const duration = snare ? .13 : .04
    envelope.gain.setValueAtTime(snare ? .12 : .035, time)
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration)
    source.connect(filter); filter.connect(envelope); envelope.connect(mix)
    own(source, [filter, envelope], time, duration)
  }
  const kick = (time: number) => {
    const source = context.createOscillator(), envelope = context.createGain()
    source.frequency.setValueAtTime(155, time)
    source.frequency.exponentialRampToValueAtTime(48, time + .07)
    source.frequency.exponentialRampToValueAtTime(42, time + .3)
    envelope.gain.setValueAtTime(.0001, time)
    envelope.gain.exponentialRampToValueAtTime(.8, time + .003)
    envelope.gain.exponentialRampToValueAtTime(.0001, time + .34)
    source.connect(envelope); envelope.connect(mix)
    own(source, [envelope], time, .35)
  }
  let next = context.currentTime + .04, step = 0
  const eighth = 60 / song.bpm / 2
  const schedule = () => {
    if (context.state !== 'running') return
    if (next < context.currentTime) next = context.currentTime + .02
    while (next < context.currentTime + .15) {
      const n = step % 16, bar = Math.floor(step / 8), root = song.bass[Math.floor(bar / 2) % 4]
      const third = song.thirds[Math.floor(bar / 2) % 4]
      const chord = [0, third, 7, 12]
      const section = bar % 32
      const breakdown = section >= 24 && section < 28
      const build = section >= 28
      const swing = track === 0 && n % 2 ? .014 : 0
      const t = next + swing
      // A complete 32-bar cycle: groove, fuller hook, breakdown, build, drop.
      if (song.notes[n] >= 0 && (!breakdown || n % 4 === 0)) {
        const pitch = root + 36 + chord[song.notes[n]]
        note(pitch, t, eighth * (track === 1 ? 1.6 : .75), 'triangle', .14, -.18, 1, true)
        if (section >= 8 && !breakdown) note(pitch + 12, t, eighth * .55, 'sine', .045, .24, 1, true)
      }
      if (!breakdown && n % 2 === 1) {
        // Offbeat bass leaves room for every kick instead of masking its attack.
        note(root + (n === 15 ? 12 : 0), t, eighth * .85, 'sawtooth', .19)
        note(root, t, eighth * .8, 'sine', .24)
      }
      if (n % 4 === 1 || (track === 2 && n % 8 === 7)) {
        for (const [i, interval] of chord.entries()) {
          note(root + 24 + interval, t, eighth * (breakdown ? 3 : .9), 'sawtooth', .045, (i - 1.5) * .4, 1, true)
          note(root + 24 + interval + .045, t, eighth * .85, 'sawtooth', .022, (1.5 - i) * .4)
        }
      }
      if (n % 8 === 0) for (const [i, interval] of chord.entries()) note(root + 24 + interval, next, eighth * 7, 'sine', .028, (i - 1.5) * .4, 1, true)
      if (!breakdown && n % 2 === 0 && !(section === 31 && n % 8 >= 6)) kick(next)
      if (!breakdown && n % 4 === 2) {
        percussion(next, true); percussion(next + .012, true)
        note(50, next, .09, 'triangle', .055)
      }
      if (!breakdown && n % 2 === 1) percussion(t, false)
      if (section >= 8 && !breakdown && n % 2 === 0) percussion(next + eighth / 2, false)
      if (build) {
        percussion(next, true)
        if (section >= 30) percussion(next + eighth / 2, true)
      }
      // A brief astromech call announces each 32-bar drop.
      if (step % 256 === 0) {
        note(88, next, .13, 'sine', .11, -.3, 1.7, true)
        note(96, next + .15, .19, 'sine', .09, .3, .55, true)
        note(91, next + .38, .08, 'triangle', .07, 0, 1.2, true)
      }
      next += eighth; step++
    }
  }
  schedule()
  const timer = window.setInterval(schedule, 50)
  return {
    master, analyser,
    dispose() {
      window.clearInterval(timer)
      for (const voice of voices) { try { voice.stop() } catch {} }
      for (const node of [mix, compressor, master, analyser, echo, feedback, wet, echoFilter]) node.disconnect()
    },
  }
}
