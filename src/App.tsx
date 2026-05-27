import { useMemo, useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { WelcomeBanner } from "./components/WelcomeBanner";
import { useMondayBoard } from "./hooks/useMondayBoard";
import { LOCATIONS, type Location } from "./config/columns";
import "./index.css";

export default function App() {
    const state = useMondayBoard();
    const [location, setLocation] = useState<Location>(LOCATIONS[0]);

    // Filter items by location client-side — they all come from the same board.
    const filteredBoard = useMemo(() => {
        if (state.status !== "ready") return null;
        const locationValues = [
            ...new Set(state.data.items.map((i) => i.location)),
        ];
        console.log(
            "Location values from board:",
            locationValues,
            "| Filtering by:",
            location,
        );
        return {
            ...state.data,
            items: state.data.items.filter((i) => i.location === location),
        };
    }, [state, location]);

    return (
        <div className="min-h-screen">
            <div className="app-shell">
                <div className="top-bar">
                    <WelcomeBanner />
                    <LocationSwitcher
                        value={location}
                        onChange={setLocation}
                        disabled={state.status === "loading"}
                    />
                </div>

                {state.status === "loading" && (
                    <div className="glass-card rounded-xl p-12 text-center stagger-item stagger-1">
                        <div className="inline-flex items-center gap-3 text-text-secondary">
                            <span className="material-symbols-outlined animate-spin text-text-secondary">
                                progress_activity
                            </span>
                            <span className="text-label-mono">
                                Loading projects…
                            </span>
                        </div>
                    </div>
                )}

                {state.status === "error" && (
                    <div className="glass-card rounded-xl p-12 text-center border border-(--st-stuck-dot)/30`">
                        <h2 className="text-headline-md text-error mb-2">
                            Failed to load board
                        </h2>
                        <p className="text-text-secondary text-label-mono">
                            {state.error}
                        </p>
                    </div>
                )}

                {state.status === "ready" && filteredBoard && (
                    <Dashboard key={location} board={filteredBoard} />
                )}
            </div>
        </div>
    );
}

/** Location filter pill — drops in where BoardSwitcher used to live. */
function LocationSwitcher({
    value,
    onChange,
    disabled,
}: {
    value: Location;
    onChange: (loc: Location) => void;
    disabled?: boolean;
}) {
    return (
        <div className="relative segmented">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-text-secondary pointer-events-none">
                location_on
            </span>
            <select
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value as Location)}
                className="appearance-none cursor-pointer pl-10 pr-9 py-2 rounded-full bg-transparent border border-transparent text-text-primary text-label-mono outline-none disabled:opacity-50"
            >
                {LOCATIONS.map((loc) => (
                    <option
                        key={loc}
                        value={loc}
                        className="bg-surface-container text-text-primary"
                    >
                        {loc}
                    </option>
                ))}
            </select>
            <span className="material-symbols-outlined text-[18px] text-text-secondary absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                expand_more
            </span>
        </div>
    );
}
