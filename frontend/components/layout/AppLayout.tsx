'use client';

import { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar onToggleSidebar={() => setSidebarOpen((o) => !o)} />
            <div className="flex flex-1">
                {sidebarOpen && <Sidebar />}
                <main className="flex-1 p-6 overflow-auto">{children}</main>
            </div>
        </div>
    );
}