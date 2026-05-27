import { useMemo } from "react";
import type { ProjectItem } from "../api/monday";

type Mode = "stacked" | "donut" | "bars";

type Props = {
    items: ProjectItem[];
    mode: Mode;
    filter: string | null;
    onFilter: (status: string | null) => void;
};

const STATUS_ORDER = [
    "In progress",
    "Stuck",
    "Acknowledged",
    "Assigned",
    "On hold",
    "Completed",
];

const STATUS_VARIANT: Record<string, string> = {
    "In progress": "progress",
    Stuck: "stuck",
    Acknowledged: "ack",
    Assigned: "assigned",
    "On hold": "hold",
    Completed: "completed",
};

type Count = { label: string; variant: string; count: number };

export function StatusSummary({ items, mode, filter, onFilter }: Props) {
    const counts = useMemo<Count[]>(() => {
        const acc = new Map<string, number>();
        for (const item of items) {
            const label = item.status?.label ?? "Assigned";
            acc.set(label, (acc.get(label) ?? 0) + 1);
        }
        return STATUS_ORDER.filter((label) => (acc.get(label) ?? 0) > 0).map(
            (label) => ({
                label,
                variant: STATUS_VARIANT[label] ?? "assigned",
                count: acc.get(label) ?? 0,
            }),
        );
    }, [items]);

    if (items.length === 0 || counts.length === 0) return null;

    const toggle = (label: string) => onFilter(filter === label ? null : label);

    return (
        <div className="status-summary">
            {mode === "donut" ? (
                <div className="summary-row">
                    <Donut
                        counts={counts}
                        total={items.length}
                        active={filter}
                        onClick={toggle}
                    />
                    <Legend
                        counts={counts}
                        active={filter}
                        onToggle={toggle}
                        onClear={() => onFilter(null)}
                    />
                </div>
            ) : mode === "bars" ? (
                <>
                    <BarChart
                        counts={counts}
                        active={filter}
                        onClick={toggle}
                    />
                    {filter && (
                        <div className="flex justify-end">
                            <button
                                className="legend-clear"
                                onClick={() => onFilter(null)}
                            >
                                Clear filter ✕
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <>
                    <StackedBar
                        counts={counts}
                        total={items.length}
                        active={filter}
                        onClick={toggle}
                    />
                    <Legend
                        counts={counts}
                        active={filter}
                        onToggle={toggle}
                        onClear={() => onFilter(null)}
                    />
                </>
            )}
        </div>
    );
}

function StackedBar({
    counts,
    total,
    active,
    onClick,
}: {
    counts: Count[];
    total: number;
    active: string | null;
    onClick: (label: string) => void;
}) {
    return (
        <div className={`stacked-bar ${active ? "filtered" : ""}`}>
            {counts.map((c) => {
                const pct = (c.count / total) * 100;
                return (
                    <button
                        key={c.label}
                        type="button"
                        className={`stacked-bar-segment ${active === c.label ? "active" : ""}`}
                        style={{
                            width: `${pct}%`,
                            background: `var(--st-${c.variant}-dot)`,
                        }}
                        onClick={() => onClick(c.label)}
                        title={`${c.label} — ${c.count} of ${total}`}
                    />
                );
            })}
        </div>
    );
}

function Legend({
    counts,
    active,
    onToggle,
    onClear,
}: {
    counts: Count[];
    active: string | null;
    onToggle: (label: string) => void;
    onClear: () => void;
}) {
    return (
        <div className="status-legend">
            {counts.map((c) => (
                <button
                    key={c.label}
                    type="button"
                    className={`legend-chip ${active === c.label ? "active" : ""}`}
                    onClick={() => onToggle(c.label)}
                >
                    <span
                        className="legend-dot"
                        style={{ background: `var(--st-${c.variant}-dot)` }}
                    />
                    <span>{c.label}</span>
                    <span className="legend-count">{c.count}</span>
                </button>
            ))}
            {active && (
                <button className="legend-clear" onClick={onClear}>
                    Clear ✕
                </button>
            )}
        </div>
    );
}

function Donut({
    counts,
    total,
    active,
    onClick,
}: {
    counts: Count[];
    total: number;
    active: string | null;
    onClick: (label: string) => void;
}) {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const activeCount = active
        ? (counts.find((c) => c.label === active)?.count ?? 0)
        : total;

    // Pre-compute cumulative offsets so nothing mutates during render.
    const segments = counts.map((c, i) => {
        const prior = counts
            .slice(0, i)
            .reduce((sum, x) => sum + (x.count / total) * circumference, 0);
        return { c, len: (c.count / total) * circumference, offset: prior };
    });

    return (
        <div className="summary-donut">
            <svg viewBox="0 0 96 96" width="96" height="96" aria-hidden="true">
                <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    fill="none"
                    stroke="var(--surface-sunken)"
                    strokeWidth="10"
                />
                {segments.map(({ c, len, offset }) => {
                    const segment = (
                        <circle
                            key={c.label}
                            cx="48"
                            cy="48"
                            r={radius}
                            fill="none"
                            stroke={`var(--st-${c.variant}-dot)`}
                            strokeWidth="10"
                            strokeDasharray={`${len} ${circumference - len}`}
                            strokeDashoffset={-offset}
                            transform="rotate(-90 48 48)"
                            style={{
                                cursor: "pointer",
                                opacity: active && active !== c.label ? 0.3 : 1,
                            }}
                            onClick={() => onClick(c.label)}
                        />
                    );
                    return segment;
                })}
            </svg>
            <div className="donut-label">
                <span className="donut-num">{activeCount}</span>
                <span className="donut-sub">
                    {active ? active.toUpperCase() : "PROJECTS"}
                </span>
            </div>
        </div>
    );
}

function BarChart({
    counts,
    active,
    onClick,
}: {
    counts: Count[];
    active: string | null;
    onClick: (label: string) => void;
}) {
    const max = Math.max(...counts.map((c) => c.count), 1);
    return (
        <div className="bar-chart" role="group" aria-label="Status breakdown">
            {counts.map((c) => (
                <button
                    key={c.label}
                    type="button"
                    className={`bar-col ${active && active !== c.label ? "dim" : ""}`}
                    onClick={() => onClick(c.label)}
                >
                    <div className="bar-track">
                        <div
                            className="bar-fill"
                            style={{
                                height: `${(c.count / max) * 100}%`,
                                background: `var(--st-${c.variant}-dot)`,
                            }}
                        />
                    </div>
                    <div className="bar-label">
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                            <span
                                className="legend-dot"
                                style={{
                                    background: `var(--st-${c.variant}-dot)`,
                                }}
                            />
                            <span className="truncate">{c.label}</span>
                        </span>
                        <span className="bar-count">{c.count}</span>
                    </div>
                </button>
            ))}
        </div>
    );
}
