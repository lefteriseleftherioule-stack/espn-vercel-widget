import './globals.css'
import type { ReactNode } from 'react'

export const metadata = { title: 'ESPN Scoreboard Widget', description: 'Embeddable scoreboard' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
