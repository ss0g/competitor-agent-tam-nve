import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import AuthProvider from "./providers/AuthProvider";

export const metadata: Metadata = {
  title: "Competitor Research Agent",
  description: "AI-powered competitor research and analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navigation />
          <main className="min-h-screen" style={{ backgroundColor: '#EFE9DE' }}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
