# 11 R2-D2-inspired jukebox

Type: prototype
Status: resolved
Role: Divya

## Question

Add a local R2-D2-themed jukebox to the arcade, as requested by Divya.

## Answer

Added a procedural blue-and-white astromech cabinet with a rotating dome, illuminated eye, speaker, animated equalizer and glowing base. Three original Web Audio loops have track selection, Play/Pause and volume controls. Playback starts only after interaction, continues when the room controls close or a Machine is selected, and stops on unmount. No added dependencies, downloaded music or backend.

The Room includes the jukebox and a control button, respecting the existing title-screen visibility. A dedicated close-up preview is available at `/dev/jukebox` with orbit controls. Source is in `src/jukebox/`.

## Comments

- Publication: Divya subsequently requested committing and pushing the completed jukebox to the existing `divya` GitHub branch. Includes the standalone preview, cabinet, original house/EDM audio, soundtrack handoff and Room integration. Separate local title-screen work is excluded.

- Audio refinement: three original arcade-house/EDM tracks at 120–128 BPM, harmonically matched hooks and chords, four-on-the-floor kicks, offbeat bass, detuned chord stabs, claps, hats, stereo echo and 32-bar breakdown/build/drop arrangements. Enlarged the ASTROMECH sign with high-contrast bold lettering and removed its small subtitle. Browser confirms audio output and automatic room soundtrack suppression.

- Latest local design: adapted the provided arcade document, then followed Divya's updated direction to space grey and deep blue. Replaced the side circles with recessed slotted vents, added a cool illuminated ASTROMECH sign, worn metal hardware and blue analog controls. Shared PS1 canvas retains the arcade look. Expanded the three original tracks with bass, percussion, chords, stereo echo and droid calls; disposable synth engines clean up on pause/track changes. Playback signal and default soundtrack handoff verified in the browser.

- Vintage visual pass: cream enamel and faded teal panels, aged brass dome and bands, warm amber lights, speaker-cloth grille, cabinet hardware and wear marks. Matching radio-style controls use a wood-colored surround, parchment song buttons, green dial glass and a moving selection needle. Narrow previews stack the cabinet above controls so the droid remains visible. Audio behavior unchanged; kept local.

- Follow-up: brought the actual room soundtrack from `origin/main` (e314677) into this older local checkout, preserving its composition and adapting intro readiness to an `enabled` prop for the local title screen. A reference-counted jukebox audio claim fades the room music to silence while the jukebox plays and restores it on pause/unmount without resetting the manual mute choice.
- Added a 3D chest touchscreen for Play/Pause, Next and volume. The droid equalizer now reads frequency data from the actual audio output; the companion panel reports an active signal. Browser checks confirmed chest Play produces a nonzero audio signal, pauses the room music, and retains manual room mute after jukebox pause. Kept local.

- Local-only request: no commit or push. `Room.tsx` integration is within this user-requested addition; existing landing-page edits were preserved.
- Validation: TypeScript `--noEmit` passed. Browser preview rendered the droid and controls; Play successfully resumed audio and the display changed to NOW TRANSMITTING without an error.
