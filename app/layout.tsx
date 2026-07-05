import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CRM Oeiras360",
    template: "%s · CRM Oeiras360",
  },
  description: "A focused CRM for the Oeiras360 sales pipeline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased">
        <ToastProvider>
          <div className="min-h-screen md:grid md:grid-cols-[240px_minmax(0,1fr)]">
            <Sidebar />
            <main className="min-w-0 px-4 pb-12 pt-20 sm:px-6 md:px-10 md:py-10">
              <div className="mx-auto max-w-[1400px]">{children}</div>
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
