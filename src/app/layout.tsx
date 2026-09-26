import type { Metadata } from 'next'
import { VT323 } from 'next/font/google'
import './globals.css'

// The one typeface (issue 12): the Shell, the Store HUD and every cabinet Display draw with it.
const vt323 = VT323({ weight: '400', subsets: ['latin'], variable: '--font-vt323', display: 'swap' })

export const metadata: Metadata = {
  title: 'Fleekade',
  description: 'A low-poly arcade in the browser. Win Tickets, spend them on prizes.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`h-full ${vt323.variable}`}>{children}</body>
    </html>
  )
}
