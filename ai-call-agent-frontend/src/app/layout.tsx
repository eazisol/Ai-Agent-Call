import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'AI Call Agent',
    description: 'AI Call Agent Dashboard',
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