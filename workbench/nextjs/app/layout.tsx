import React from "react"

export const metadata = {
  title: 'Ekairos Workbench',
  description: 'Test environment for Ekairos workflows',
};

export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

