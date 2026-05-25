import { useState } from "react";
import { Dashboard } from "./components/dashboard";
import { WelcomeBanner } from "./components/welcome";
import { useMondayBoard } from "./components/useboard";
import { BOARDS, DEFAULT_BOARD, type BoardKey } from "./components/columnsMap";
import "./index.css";
import { BoardSwitcher } from "./components/BoardSwitcher";

export default function App() {
    const [boardKey, setBoardKey] = useState<BoardKey>(DEFAULT_BOARD);
    const state = useMondayBoard(BOARDS[boardKey].id);

    return (
        <div className="min-h-screen relative">
            <div className="ambient-orb orb-purple" />
            <div className="ambient-orb orb-teal" />

            <div className="relative z-10 mx-auto max-w-7xl p-gutter min-h-screen flex flex-col gap-gutter">
                <WelcomeBanner />
                <BoardSwitcher
                    value={boardKey}
                    onChange={setBoardKey}
                    disabled={state.status === "loading"}
                />
                {state.status === "loading" && (
                    <div className="glass-card rounded-xl p-12 text-center stagger-item stagger-1">
                        <div className="inline-flex items-center gap-3 text-text-secondary">
                            <span className="material-symbols-outlined animate-spin">
                                progress_activity
                            </span>
                            <span className="text-label-mono">
                                Connecting to monday.com…
                            </span>
                        </div>
                    </div>
                )}

                {state.status === "error" && (
                    <div className="glass-card rounded-xl p-12 text-center border border-status-stuck/30">
                        <h2 className="text-headline-md text-error mb-2">
                            Failed to load board
                        </h2>
                        <p className="text-text-secondary text-label-mono">
                            {state.error}
                        </p>
                        <p className="text-text-secondary text-xs mt-4">
                            Check that COLUMN_IDS in{" "}
                            <code>src/config/columns.ts</code> match your
                            board's actual column IDs.
                        </p>
                    </div>
                )}

                {state.status === "ready" && <Dashboard board={state.data} />}
            </div>
        </div>
    );
}
