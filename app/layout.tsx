import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TEMOOR SCHOOL ERP",
    template: "%s | TEMOOR SCHOOL ERP"
  },
  description: "Multi-tenant school management platform for operations, academics, finance, and administration."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-slate-950">
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
