import type { Metadata } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CommandPalette } from "@/components/CommandPalette";

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DreamPath | Malaysian Scholarship Intelligence",
  description: "Independent Malaysian scholarship intelligence platform with structured eligibility rules and published provider criteria.",
  openGraph: {
    title: "DreamPath | Malaysian Scholarship Intelligence",
    description: "Independent Malaysian scholarship intelligence platform with structured eligibility rules and published provider criteria.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${plusJakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#F8FAFC] text-slate-900">
        <CommandPalette />
        {children}
      </body>
    </html>
  );
}
