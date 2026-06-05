import Link from 'next/link';
import { Bot, LayoutDashboard, PhoneCall, Settings } from 'lucide-react';

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Calls', href: '/calls', icon: PhoneCall },
    { label: 'AI Settings', href: '/settings', icon: Bot },
];

export function Sidebar() {
    return (
        <aside className="h-screen w-64 border-r bg-white p-4">
            <div className="mb-8 flex items-center gap-2 text-xl font-semibold">
                <Bot className="h-6 w-6" />
                AI Call Agent
            </div>

            <nav className="space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                            <Icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}