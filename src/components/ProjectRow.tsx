import { useState } from "react";
import { SeamlessApiClient } from "@mondaydotcomorg/api";
import type { ProjectItem, SubItem } from "../api/monday";
import {
    STATUS_COLORS,
    STATUS_LABELS,
    DEFAULT_STATUS_COLOR,
    COLUMN_IDS,
} from "../config/columns";
import { useMondayUserById } from "../hooks/useMondayUserById";

const client = new SeamlessApiClient();

type Props = {
    item: ProjectItem;
    boardId: string;
    staggerIndex: number;
    onSummary: (item: ProjectItem) => void;
};

const STATUS_OPTIONS = Object.values(STATUS_LABELS);

const fmtDate = (iso: string | null) => {
    if (!iso) return "--";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
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
    const isCompleted = statusLabel === STATUS_LABELS.COMPLETED;
    const overdue = isOverdue(item.completionDate, isCompleted);

    const handleStatusChange = async (next: string) => {
        const previous = statusLabel;
        setStatusLabel(next);
        setUpdating(true);
        try {
            await client.request(
                `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!) {
          change_simple_column_value(
            board_id: $boardId,
            item_id: $itemId,
            column_id: $columnId,
            value: $value
          ) { id }
        }`,
                {
                    boardId,
                    itemId: item.id,
                    columnId: COLUMN_IDS.status,
                    value: next,
                },
            );
        } catch (err) {
            console.error("Failed to update status:", err);
            setStatusLabel(previous);
        } finally {
            setUpdating(false);
        }
    };

    const leadState = useMondayUserById(item.lead?.id ?? null);
    const leadUser = leadState.status === "ready" ? leadState.user : null;
    const leadInitials = leadUser
        ? leadUser.name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()
        : "--";

    const hasSubitems = item.subitems.length > 0;

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
            `}
        >
            <div
                onClick={toggleExpand}
                onKeyDown={onKeyDown}
                role={hasSubitems ? "button" : undefined}
                tabIndex={hasSubitems ? 0 : undefined}
                aria-expanded={hasSubitems ? expanded : undefined}
                className={`project-row p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 rounded-xl ${
                    hasSubitems ? "cursor-pointer" : ""
                }`}
            >
                <div className="flex items-start gap-3 w-full lg:w-[22%] min-w-0">
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

                    <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-headline-md text-lg text-text-primary font-bold truncate">
                                {item.name}
                            </h3>
                            {hasSubitems && (
                                <span className="text-[10px] font-mono text-primary bg-primary-container/20 border border-primary-container/40 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                    {item.subitems.length}
                                </span>
                            )}
                        </div>
                        {item.type && (
                            <span className="inline-block px-2 py-0.5 border border-outline-variant rounded text-text-secondary text-[10px] font-mono w-max">
                                {item.type}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full lg:w-[30%]">
                    <div className="flex items-center gap-2 min-w-25">
                        {item.lead ? (
                            leadUser?.photoUrl ? (
                                <img
                                    src={leadUser.photoUrl}
                                    alt={leadUser.name}
                                    className="w-6 h-6 rounded-full object-cover border border-primary-container/40"
                                />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center text-xs font-mono">
                                    {leadState.status === "loading" ? (
                                        <span className="w-3 h-3 rounded-full bg-primary/40 animate-pulse" />
                                    ) : (
                                        leadInitials
                                    )}
                                </div>
                            )
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-surface-variant flex items-center justify-center text-xs font-mono">
                                --
                            </div>
                        )}
                        <span
                            className={`text-sm truncate ${item.lead ? "text-text-primary" : "text-text-secondary"}`}
                        >
                            {item.lead
                                ? (leadUser?.name ??
                                  (leadState.status === "loading"
                                      ? "Loading.."
                                      : "Unknown"))
                                : "Pending"}
                        </span>
                    </div>
                    {item.masterProject && (
                        <span className="px-2 py-1 bg-secondary-container/20 text-secondary border border-secondary/30 rounded text-xs whitespace-nowrap truncate max-w-35">
                            {item.masterProject}
                        </span>
                    )}
                    <span className="text-kpi-display text-xl ml-auto border-b-2 text-text-primary border-secondary">
                        {item.value != null
                            ? `$${item.value.toLocaleString()}`
                            : "N/A"}
                    </span>
                </div>

                <div className="flex items-center gap-2 w-full lg:w-[25%]">
                    <div className="px-2 py-1 rounded bg-surface-container/50 border border-outline-variant/30 flex flex-col flex-1">
                        <span className="text-[8px] text-text-secondary font-mono">
                            ASSIGNED
                        </span>
                        <span className="text-xs text-text-primary font-mono">
                            {fmtDate(item.assignmentDate)}
                        </span>
                    </div>
                    <div
                        className={`px-2 py-1 rounded flex flex-col flex-1 bg-surface-container/50 border border-outline-variant/30 ${!item.acknowledgmentDate ? "opacity-50" : ""}`}
                    >
                        <span className="text-[8px] text-text-secondary font-mono">
                            ACK'D
                        </span>
                        <span className="text-xs text-text-primary font-mono">
                            {fmtDate(item.acknowledgmentDate)}
                        </span>
                    </div>
                    <div
                        className={`px-2 py-1 rounded flex flex-col flex-1 ${overdue ? "bg-status-stuck/10 border border-status-stuck/30" : "bg-surface-container/50 border border-outline-variant/30"}`}
                    >
                        <span
                            className={`text-[8px] font-mono ${overdue ? "text-error" : "text-text-secondary"}`}
                        >
                            DUE
                        </span>
                        <span
                            className={`text-xs font-mono ${overdue ? "text-error" : "text-text-primary"}`}
                        >
                            {fmtDate(item.completionDate)}
                        </span>
                    </div>
                    {item.mirrorPercent != null && (
                        <div className="flex flex-col items-center justify-center min-w-11">
                            <span className="text-xs font-mono text-text-primary font-bold">
                                {item.mirrorPercent}%
                            </span>
                            <span className="text-[8px] text-text-secondary font-mono">
                                SUBTASKS
                            </span>
                        </div>
                    )}
                </div>

                <div
                    className="flex items-center gap-3 w-full lg:w-[23%] justify-end"
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
                        title={item.executiveSummary ?? "No summary yet"}
                    >
                        ✦ SUMMARY
                    </button>
                </div>
            </div>

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

function SubitemRow({ sub, index }: { sub: SubItem; index: number }) {
    const subColor = "#ccc";
    return (
        <li
            className="drill-subitem flex items-center gap-3 pl-4 pr-3 py-2 rounded-lg bg-surface-container/30 border border-outline-variant/20 hover:bg-surface-container/60 transition-colors"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            <span className="material-symbols-outlined text-[16px] text-text-secondary">
                subdirectory_arrow_right
            </span>
            <span className="text-sm text-text-primary truncate flex-1">
                {sub.name}
            </span>
            {sub.status && (
                <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full whitespace-nowrap"
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
