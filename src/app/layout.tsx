import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pakkmaxx | Freight Forwarding & Shipment Tracking",
  description:
    "Pakkmaxx - Professional freight forwarding from USA to Ghana. Track your packages, manage orders, and get real-time WhatsApp notifications.",
  keywords: ["freight forwarding", "Ghana shipping", "package tracking", "Pakkmaxx"],
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
