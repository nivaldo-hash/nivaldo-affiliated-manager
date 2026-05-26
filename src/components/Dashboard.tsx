import { useMemo, useState } from "react";
import type { BoardData, ProjectItem } from "../api/monday";
import { StatusDistribution } from "./StatusDistribution";
import { ProjectRow } from "./ProjectRow";
import { SummaryModal } from "./SummaryModal";

type Props = { board: BoardData };

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function Dashboard({ board }: Props) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [activeSummary, setActiveSummary] = useState<ProjectItem | null>(
        null,
    );

    const totalPages = Math.max(1, Math.ceil(board.items.length / pageSize));
    const paged = useMemo(() => {
        const start = (page - 1) * pageSize;
        return board.items.slice(start, start + pageSize);
    }, [board.items, page, pageSize]);

    const activeCount = board.items.filter(
        (i) =>
            i.status?.label &&
            !["Completed", "On Hold"].includes(i.status.label),
    ).length;

    const pageNumbers: (number | "...")[] = useMemo(() => {
        if (totalPages <= 5)
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        return [1, 2, 3, "...", totalPages];
    }, [totalPages]);

    return (
        <>
            {/* Header */}
            <header className="glass-card rounded-xl p-6 flex flex-col gap-4 stagger-item stagger-1">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h1 className="text-headline-lg text-text-primary">
                            {board.name}
                        </h1>
                        <span className="px-3 py-1 rounded-full bg-primary-container/20 border border-primary-container text-primary text-label-mono flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(195,192,255,0.8)]" />
                            {activeCount} pending projects
                        </span>
                    </div>
                </div>
            </header>

            <StatusDistribution items={board.items} />

            <section className="flex flex-col gap-3">
                {paged.length === 0 ? (
                    <div className="glass-card rounded-xl p-12 text-center text-text-secondary">
                        No items on this board yet.
                    </div>
                ) : (
                    paged.map((item, i) => (
                        <ProjectRow
                            key={item.id}
                            item={item}
                            boardId={board.id}
                            staggerIndex={i + 2}
                            onSummary={setActiveSummary}
                        />
                    ))
                )}
            </section>

            <footer className="glass-card rounded-xl p-4 mt-2 flex flex-col md:flex-row items-center justify-between gap-6 stagger-item stagger-5">
                <span className="text-xs font-mono text-text-secondary uppercase tracking-wider order-2 md:order-1">
                    Showing{" "}
                    <span className="text-primary">
                        {(page - 1) * pageSize + 1}-
                        {Math.min(page * pageSize, board.items.length)}
                    </span>{" "}
                    of{" "}
                    <span className="text-primary">{board.items.length}</span>{" "}
                    agents
                </span>

                <nav className="flex items-center gap-1.5 order-1 md:order-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="page-btn w-9 h-9 rounded-lg bg-surface-container/50 border border-outline-variant/30 flex items-center justify-center text-on-surface-variant disabled:opacity-30"
                    ></button>
                    {pageNumbers.map((p, i) =>
                        p === "..." ? (
                            <span
                                key={`ellipsis-${i}`}
                                className="px-2 text-outline"
                            >
                                …
                            </span>
                        ) : (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`page-btn w-9 h-9 rounded-lg text-xs font-mono flex items-center justify-center ${
                                    page === p
                                        ? "bg-primary-container text-white shadow-[0_0_15px_rgba(59,47,207,0.4)]"
                                        : "bg-surface-container/50 border border-outline-variant/30 text-on-surface-variant"
                                }`}
                            >
                                {p}
                            </button>
                        ),
                    )}
                    <button
                        disabled={page === totalPages}
                        onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                        }
                        className="page-btn w-9 h-9 rounded-lg bg-surface-container/50 border border-outline-variant/30 flex items-center justify-center text-on-surface-variant disabled:opacity-30"
                    ></button>
                </nav>

                <div className="flex items-center gap-2 order-3">
                    <span className="text-[10px] font-mono text-text-secondary uppercase">
                        Per page:
                    </span>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setPage(1);
                        }}
                        className="appearance-none bg-surface-container/50 border border-outline-variant/30 rounded-md pl-3 pr-8 py-1 text-xs font-mono text-text-primary outline-none cursor-pointer hover:bg-surface-bright"
                    >
                        {PAGE_SIZE_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                    </select>
                </div>
            </footer>

            {/* Summary modal */}
            {activeSummary && (
                <SummaryModal
                    item={activeSummary}
                    boardId={board.id}
                    onClose={() => setActiveSummary(null)}
                />
            )}
        </>
    );
}
