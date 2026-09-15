import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const neueHaas = localFont({
  src: [
    {
      path: "../../public/fonts/NeueHaasDisplayThin.ttf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../../public/fonts/NeueHaasDisplayLight.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/NeueHaasDisplayRoman.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/NeueHaasDisplayMedium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/NeueHaasDisplayBold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/NeueHaasDisplayBlack.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-neue-haas",
});

export const metadata: Metadata = {
  title: "Arches ERP",
  description: "Internal Operations System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${neueHaas.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-off-white text-near-black">
        {children}
      </body>
    </html>
  );
}
