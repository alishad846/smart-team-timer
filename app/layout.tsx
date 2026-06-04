import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartTeamTimer",
  description: "Modern productivity tracking for remote teams, interns, and managers."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className="font-sans"
        style={
          {
            "--font-sans": '"Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif',
            "--font-mono": '"Cascadia Mono", "SFMono-Regular", Consolas, monospace'
          } as React.CSSProperties
        }
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
