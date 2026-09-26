import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fleekade',
  description: 'A low-poly arcade in the browser. Win Tickets, spend them on prizes.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-full">{children}</body>
    </html>
  )
}
