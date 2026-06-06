import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitCraft — Beautiful Developer Assets",
  description: "Create beautiful, shareable assets from your GitHub profile.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
