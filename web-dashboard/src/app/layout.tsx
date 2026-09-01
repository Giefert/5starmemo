import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const fraunces = localFont({
  src: [
    { path: "./fonts/Fraunces_400Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Fraunces_500Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Fraunces_600SemiBold.ttf", weight: "600", style: "normal" },
  ],
  variable: "--font-fraunces",
  display: "swap",
  preload: false,
});

const inter = localFont({
  src: [
    { path: "./fonts/Inter_400Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Inter_500Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Inter_600SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/Inter_700Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});

const newsreader = localFont({
  src: [
    { path: "./fonts/Newsreader_400Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Newsreader_400Regular_Italic.ttf", weight: "400", style: "italic" },
  ],
  variable: "--font-newsreader",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Tusavor",
  description: "Tusavor admin — flashcard decks for restaurant staff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${newsreader.variable}`}
    >
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
