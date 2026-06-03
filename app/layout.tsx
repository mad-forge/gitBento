import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitBento",
  description: "Create draggable GitHub profile bento grids.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
