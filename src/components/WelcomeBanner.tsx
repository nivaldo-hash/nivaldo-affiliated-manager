import { useEffect, useState } from "react";
import { useMondayUser } from "../hooks/useMondayUser";

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "Working late";
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
};

export function WelcomeBanner() {
    const state = useMondayUser();
    const [imageLoaded, setImageLoaded] = useState(false);

    const greeting = getGreeting();
    const firstName = state.user?.firstName ?? "";
    const [revealed, setRevealed] = useState(0);

    useEffect(() => {
        if (state.status !== "ready") return;
        const full = `${greeting}, ${firstName}`;
        if (revealed >= full.length) return;
        const t = setTimeout(() => setRevealed((r) => r + 1), 40);
        return () => clearTimeout(t);
    }, [revealed, state.status, greeting, firstName]);

    if (state.status === "loading") {
        return (
            <div className="welcome-banner-skeleton flex items-center gap-4 px-6 py-4">
                <div className="w-12 h-12 rounded-full bg-surface-variant animate-pulse" />
                <div className="h-4 w-40 bg-surface-variant rounded animate-pulse" />
            </div>
        );
    }

    if (state.status === "error" || !state.user) return null;

    const { name, photoUrl } = state.user;
    const initials = name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const fullText = `${greeting}, ${firstName}`;
    const visibleText = fullText.slice(0, revealed);
    const isDoneRevealing = revealed >= fullText.length;

    return (
        <div className="welcome-banner flex items-center gap-4 px-6 py-3">
            <div className="welcome-avatar relative shrink-0">
                <div className="welcome-avatar-ring" />
                {photoUrl && !imageLoaded && (
                    <div className="absolute inset-0 rounded-full bg-surface-variant animate-pulse" />
                )}
                {photoUrl ? (
                    <img
                        src={photoUrl}
                        alt={name}
                        onLoad={() => setImageLoaded(true)}
                        className={`relative z-10 w-12 h-12 rounded-full object-cover border-2 border-primary-container/40 transition-opacity duration-500 ${
                            imageLoaded ? "opacity-100" : "opacity-0"
                        }`}
                    />
                ) : (
                    <div className="relative z-10 w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-text-primary font-bold text-sm">
                        {initials}
                    </div>
                )}
            </div>

            <div className="flex flex-col">
                <span className="text-text-secondary text-label-mono uppercase tracking-wider">
                    Welcome back
                </span>
                <h2 className="welcome-greeting text-headline-md text-text-primary font-medium">
                    {visibleText}
                    {!isDoneRevealing && (
                        <span className="welcome-cursor">|</span>
                    )}
                    {isDoneRevealing && (
                        <span className="welcome-wave"> 👋</span>
                    )}
                </h2>
            </div>
        </div>
    );
}
