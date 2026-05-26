import { useState } from "react";
import type { ProjectItem, SubItem } from "../api/monday";
import { updateItemStatus } from "../api/monday";
import {
    STATUS_COLORS,
    STATUS_LABELS,
    DEFAULT_STATUS_COLOR,
} from "../config/columns";
import { useMondayUserById } from "../hooks/useMondayUserById";

type Props = {
    item: ProjectItem;
    boardId: string;
    staggerIndex: number;
    onSummary: (item: ProjectItem) => void;
};

const STATUS_OPTIONS = Object.values(STATUS_LABELS);

const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    });
};

const isOverdue = (iso: string | null, completed: boolean) => {
    if (!iso || completed) return false;
    return new Date(iso) < new Date();
};

const stop = (e: React.MouseEvent) => e.stopPropagation();

export function ProjectRow({ item, boardId, staggerIndex, onSummary }: Props) {
    const [statusLabel, setStatusLabel] = useState(
        item.status?.label ?? STATUS_LABELS.ASSIGNED,
    );
    const [updating, setUpdating] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const color = STATUS_COLORS[statusLabel] ?? DEFAULT_STATUS_COLOR;
    const hasSubitems = item.subitems.length > 0;

    const handleStatusChange = async (next: string) => {
        const previous = statusLabel;
        setStatusLabel(next);
        setUpdating(true);
        try {
            await updateItemStatus(boardId, item.id, next);
        } catch (err) {
            console.error("Failed to update status:", err);
            setStatusLabel(previous);
        } finally {
            setUpdating(false);
        }
    };

    const toggleExpand = () => {
        if (hasSubitems) setExpanded((v) => !v);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (!hasSubitems) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
        }
    };

    return (
        <div
            className={`glass-card rounded-xl stagger-item stagger-${Math.min(staggerIndex + 1, 5)}
            }`}
        >
            {/* Main clickable row */}
            <div
                onClick={toggleExpand}
                onKeyDown={onKeyDown}
                role={hasSubitems ? "button" : undefined}
                tabIndex={hasSubitems ? 0 : undefined}
                aria-expanded={hasSubitems ? expanded : undefined}
                className={`project-row p-4 flex flex-col lg:flex-row lg:items-center gap-4 rounded-xl ${
                    hasSubitems ? "cursor-pointer" : ""
                }`}
            >
                {/* Project name with chevron + subitem count */}
                <div className="flex items-start gap-3 lg:w-[30%] min-w-0">
                    {hasSubitems ? (
                        <span
                            className={`material-symbols-outlined text-[20px] mt-0.5 text-primary transition-transform duration-300 shrink-0 ${
                                expanded ? "rotate-90" : ""
                            }`}
                            aria-hidden="true"
                        >
                            chevron_right
                        </span>
                    ) : (
                        <span className="w-5 shrink-0" aria-hidden="true" />
                    )}
                    <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-headline-md text-lg text-text-primary font-bold truncate">
                            {item.name}
                        </h3>
                        {hasSubitems && (
                            <span className="text-[10px] font-mono text-primary bg-primary-container/20 border border-primary-container/40 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                {item.subitems.length}
                            </span>
                        )}
                    </div>
                </div>

                {/* Team Project */}
                <div className="lg:w-[25%] flex items-center">
                    {item.teamProject ? (
                        <span className="px-2 py-1 bg-secondary-container/20 text-secondary border border-secondary/30 rounded text-xs whitespace-nowrap truncate max-w-full">
                            {item.teamProject}
                        </span>
                    ) : (
                        <span className="text-text-secondary text-xs">—</span>
                    )}
                </div>

                {/* Status + Summary — stop propagation so they don't toggle the row */}
                <div
                    className="flex items-center gap-3 lg:w-[45%] justify-end"
                    onClick={stop}
                >
                    <div className="relative">
                        <select
                            value={statusLabel}
                            disabled={updating}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            onClick={stop}
                            className="appearance-none cursor-pointer pl-8 pr-8 py-1.5 rounded-full text-xs font-mono outline-none disabled:opacity-50"
                            style={{
                                backgroundColor: `${color}26`,
                                borderWidth: 1,
                                borderStyle: "solid",
                                borderColor: `${color}80`,
                                color,
                                boxShadow: `0 0 10px ${color}33`,
                            }}
                        >
                            {STATUS_OPTIONS.map((opt) => (
                                <option
                                    key={opt}
                                    value={opt}
                                    className="bg-surface-container text-text-primary"
                                >
                                    {opt}
                                </option>
                            ))}
                        </select>
                        <span
                            className="w-1.5 h-1.5 rounded-full absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{
                                backgroundColor: color,
                                boxShadow: `0 0 5px ${color}`,
                            }}
                        />
                        <span
                            className="material-symbols-outlined text-[14px] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ color }}
                        >
                            arrow_drop_down
                        </span>
                    </div>

                    <button
                        onClick={(e) => {
                            stop(e);
                            onSummary(item);
                        }}
                        className="btn-shimmer px-4 py-1.5 rounded-lg text-xs font-mono text-primary font-bold tracking-wider whitespace-nowrap"
                        title={
                            item.executiveSummary ??
                            "Generate executive summary"
                        }
                    >
                        ✦ SUMMARY
                    </button>
                </div>
            </div>

            {/* Drill-down */}
            {hasSubitems && (
                <div
                    className={`drill-panel ${expanded ? "drill-panel-open" : ""}`}
                >
                    <div className="overflow-hidden">
                        <div className="px-4 pb-4 pt-1 border-t border-outline-variant/20">
                            <div className="text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-2 mt-2">
                                Subitems
                            </div>
                            <ul className="flex flex-col gap-1.5">
                                {item.subitems.map((sub, i) => (
                                    <SubitemRow
                                        key={sub.id}
                                        sub={sub}
                                        index={i}
                                    />
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/** Single subitem with owner avatar/name, due date, and status pill. */
function SubitemRow({ sub, index }: { sub: SubItem; index: number }) {
    const ownerState = useMondayUserById(sub.ownerId);
    const owner = ownerState.status === "ready" ? ownerState.user : null;
    const subColor = sub.status
        ? (STATUS_COLORS[sub.status] ?? DEFAULT_STATUS_COLOR)
        : DEFAULT_STATUS_COLOR;

    const isCompleted = sub.status === STATUS_LABELS.COMPLETED;
    const overdue = isOverdue(sub.dueDate, isCompleted);

    const initials = owner
        ? owner.name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()
        : "—";

    return (
        <li
            className="drill-subitem flex items-center gap-3 pl-4 pr-3 py-2 rounded-lg bg-surface-container/30 border border-outline-variant/20 hover:bg-surface-container/60 transition-colors"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            <span className="material-symbols-outlined text-[16px] text-text-secondary shrink-0">
                subdirectory_arrow_right
            </span>

            <span className="text-sm text-text-primary truncate flex-1">
                {sub.name}
            </span>

            {/* Owner avatar + name */}
            {sub.ownerId != null && (
                <div className="flex items-center gap-2 shrink-0">
                    {owner?.photoUrl ? (
                        <img
                            src={owner.photoUrl}
                            alt={owner.name}
                            className="w-6 h-6 rounded-full object-cover border border-primary-container/40"
                        />
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-primary-container/40 flex items-center justify-center text-[10px] font-mono">
                            {ownerState.status === "loading" ? (
                                <span className="w-2.5 h-2.5 rounded-full bg-primary/40 animate-pulse" />
                            ) : (
                                initials
                            )}
                        </div>
                    )}
                    <span className="text-xs text-text-secondary max-w-30 truncate">
                        {owner?.name ??
                            (ownerState.status === "loading"
                                ? "Loading…"
                                : "Unknown")}
                    </span>
                </div>
            )}

            {/* Due date pill */}
            {sub.dueDate && (
                <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 flex items-center gap-1 ${
                        overdue
                            ? "bg-status-stuck/15 text-error border border-status-stuck/40"
                            : "bg-surface-container/60 text-text-secondary border border-outline-variant/30"
                    }`}
                >
                    <span className="material-symbols-outlined text-[12px]">
                        {overdue ? "warning" : "event"}
                    </span>
                    {fmtDate(sub.dueDate)}
                </span>
            )}

            {/* Status pill */}
            {sub.status && (
                <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full whitespace-nowrap shrink-0"
                    style={{
                        backgroundColor: `${subColor}22`,
                        color: subColor,
                        border: `1px solid ${subColor}66`,
                        boxShadow: `0 0 6px ${subColor}33`,
                    }}
                >
                    {sub.status}
                </span>
            )}
        </li>
    );
}
