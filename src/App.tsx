import { useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { WelcomeBanner } from "./components/WelcomeBanner";
import { BoardSwitcher } from "./components/BoardSwitcher";
import { useMondayBoard } from "./hooks/useMondayBoard";
import { useAvailableBoards } from "./hooks/useAvailableBoards";
import "./index.css";

export default function App() {
    const boardsState = useAvailableBoards();
    const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

    const activeBoardId =
        selectedBoardId ??
        (boardsState.status === "ready" && boardsState.boards.length > 0
            ? boardsState.boards[0].id
            : null);

    const boardState = useMondayBoard(activeBoardId ?? "");
    const activeBoard =
        boardsState.status === "ready"
            ? boardsState.boards.find((b) => b.id === activeBoardId)
            : null;

    return (
        <div className="min-h-screen relative">
            <div className="ambient-orb orb-purple" />
            <div className="ambient-orb orb-teal" />

            <div className="relative z-10 mx-auto max-w-7xl p-gutter min-h-screen flex flex-col gap-gutter">
                <div className="flex items-center justify-between gap-4">
                    <WelcomeBanner />
                    {boardsState.status === "ready" && activeBoardId && (
                        <BoardSwitcher
                            boards={boardsState.boards}
                            value={activeBoardId}
                            onChange={setSelectedBoardId}
                            disabled={boardState.status === "loading"}
                        />
                    )}
                </div>

                {(boardsState.status === "loading" ||
                    boardState.status === "loading") && (
                    <div className="glass-card rounded-xl p-12 text-center stagger-item stagger-1">
                        <div className="inline-flex items-center gap-3 text-text-secondary">
                            <span className="material-symbols-outlined animate-spin">
                                progress_activity
                            </span>
                            <span className="text-label-mono">
                                {boardsState.status === "loading"
                                    ? "Discovering boards…"
                                    : `Loading ${activeBoard?.name ?? "board"}…`}
                            </span>
                        </div>
                    </div>
                )}

                {boardsState.status === "error" && (
                    <div className="glass-card rounded-xl p-12 text-center border border-status-stuck/30">
                        <h2 className="text-headline-md text-error mb-2">
                            Couldn't discover boards
                        </h2>
                        <p className="text-text-secondary text-label-mono">
                            {boardsState.error}
                        </p>
                    </div>
                )}

                {boardState.status === "error" && (
                    <div className="glass-card rounded-xl p-12 text-center border border-status-stuck/30">
                        <h2 className="text-headline-md text-error mb-2">
                            Failed to load board
                        </h2>
                        <p className="text-text-secondary text-label-mono">
                            {boardState.error}
                        </p>
                    </div>
                )}

                {boardState.status === "ready" && (
                    <Dashboard key={activeBoardId} board={boardState.data} />
                )}
            </div>
        </div>
    );
}
