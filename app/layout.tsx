import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TEMPLE GEN-02 — Cerebral Blood-Flow & Entropy Neural Wearable',
  description:
    'Hardware connection and biometric calibration ritual for Continue Research TEMPLE GEN-02.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-finish="deep-blue"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
          {children}
      </body>
    </html>
  )
}
