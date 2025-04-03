import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'L4U Tic-tac-toe game',
  description: 'Online tic-tac-toe game',
  generator: 'L4U TECH',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
