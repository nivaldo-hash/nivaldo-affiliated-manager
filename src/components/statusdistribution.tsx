import { useMemo } from "react";
import type { ProjectItem } from "./api";
import {
    STATUS_COLORS,
    STATUS_LABELS,
    DEFAULT_STATUS_COLOR,
} from "./columnsMap";

type Props = { items: ProjectItem[] };

const ORDERED_STATUSES = [
    STATUS_LABELS.ASSIGNED,
    STATUS_LABELS.IN_PROGRESS,
    STATUS_LABELS.COMPLETED,
    STATUS_LABELS.ACKNOWLEDGED,
    STATUS_LABELS.ON_HOLD,
];

export function StatusDistribution({ items }: Props) {
    const { total, segments } = useMemo(() => {
        const counts = new Map<string, number>();
        for (const item of items) {
            const label = item.status?.label;
            if (!label) continue;
            counts.set(label, (counts.get(label) ?? 0) + 1);
        }
        const total = items.length;
        const segments = ORDERED_STATUSES.map((label) => {
            const count = counts.get(label) ?? 0;
            return {
                label,
                count,
                percent: total === 0 ? 0 : Math.round((count / total) * 100),
                color: STATUS_COLORS[label] ?? DEFAULT_STATUS_COLOR,
            };
        });
        return { total, segments };
    }, [items]);

    type DonutSegment = (typeof segments)[number] & {
        dasharray: string;
        dashoffset: number;
    };
    const donutSegments = segments
        .filter((s) => s.count > 0)
        .reduce<DonutSegment[]>((acc, s) => {
            const offset = acc.reduce((sum, prev) => sum + prev.percent, 0);
            return [
                ...acc,
                {
                    ...s,
                    dasharray: `${s.percent} ${100 - s.percent}`,
                    dashoffset: -offset,
                },
            ];
        }, []);

    return (
        <section className="glass-card rounded-xl p-8 flex flex-col md:flex-row gap-8 items-center stagger-item stagger-2">
            <div className="w-full md:w-[60%] flex justify-center relative donut-container">
                <svg width="240" height="240" viewBox="0 0 42 42">
                    <circle
                        cx="21"
                        cy="21"
                        r="15.91549430918954"
                        fill="transparent"
                        stroke="#303448"
                        strokeWidth="6"
                    />
                    {donutSegments.map((s) => (
                        <circle
                            key={s.label}
                            className="donut-segment"
                            cx="21"
                            cy="21"
                            r="15.91549430918954"
                            fill="transparent"
                            stroke={s.color}
                            strokeWidth="6"
                            strokeDasharray={s.dasharray}
                            strokeDashoffset={s.dashoffset}
                        />
                    ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-kpi-display text-text-primary drop-shadow-md">
                        {total}
                    </span>
                    <span className="text-label-mono text-text-secondary">
                        Total Projects
                    </span>
                </div>
            </div>

            <div className="w-full md:w-[40%] flex flex-col gap-4">
                <div className="flex justify-between items-center mb-2 border-b border-outline-variant/30 pb-2">
                    <span className="text-label-mono text-text-secondary">
                        Distribution
                    </span>
                    <div className="flex items-center gap-1 text-text-secondary text-[10px] font-mono">
                        <span className="material-symbols-outlined text-[14px]">
                            refresh
                        </span>
                        Just now
                    </div>
                </div>
                <div className="flex flex-col gap-3">
                    {segments.map((s, i) => (
                        <div
                            key={s.label}
                            className={`stagger-item stagger-${Math.min(i + 1, 5)}`}
                        >
                            <div className="flex justify-between text-label-mono mb-1">
                                <span className="flex items-center gap-2">
                                    <span
                                        className="w-2 h-2 rounded-full"
                                        style={{
                                            backgroundColor: s.color,
                                            boxShadow: `0 0 5px ${s.color}`,
                                        }}
                                    />
                                    {s.label} ({s.count})
                                </span>
                                <span className="text-text-secondary">
                                    {s.percent}%
                                </span>
                            </div>
                            <div className="w-full bg-surface-variant h-1 rounded-full overflow-hidden">
                                <div
                                    className="h-full transition-all duration-500"
                                    style={{
                                        width: `${s.percent}%`,
                                        backgroundColor: s.color,
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
