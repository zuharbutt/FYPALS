import { ThemeProvider } from '@/components/theme/ThemeProvider';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
                {/* Decorative purple glow blobs — matches Dashdark X aesthetic */}
                <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-purple-700/20 blur-3xl" />
                <div className="w-full max-w-md relative z-10">{children}</div>
            </div>
        </ThemeProvider>
    );
}