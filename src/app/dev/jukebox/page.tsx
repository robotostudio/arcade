'use client'
import dynamic from 'next/dynamic'
const JukeboxPreview = dynamic(() => import('./JukeboxPreview'), { ssr: false })
export default function Page() { return <JukeboxPreview /> }
