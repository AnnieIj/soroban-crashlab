import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeProvider";
import NavBar from "../components/NavBar";

export const metadata: Metadata = {
  title: "Soroban CrashLab | Smart Contract Fuzzing Platform",
  description:
    "Intelligent mutation testing and runtime behavior tracing for Soroban smart contracts on the Stellar network.",
  openGraph: {
    title: "Soroban CrashLab",
    description: "Advanced fuzzing framework for Soroban smart contracts",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              var t = localStorage.getItem('crashlab:theme');
              var d = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
              document.documentElement.classList.toggle('dark', d);
            } catch(e) {}
            document.documentElement.classList.add('theme-ready');
          `
        }} />
      </head>
      <body className="antialiased min-h-screen">
        <ThemeProvider>
          <NavBar />
          <main style={{ background: 'var(--bg)', paddingTop: '52px', minHeight: '100vh' }}>
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
