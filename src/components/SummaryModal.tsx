import { useEffect, useRef, useState } from "react";
import {
    fetchItemSummary,
    triggerSummaryGeneration,
    type ProjectItem,
} from "../api/monday";

type Props = {
    item: ProjectItem;
    boardId: string;
    onClose: () => void;
};

type Phase = "triggering" | "polling" | "done" | "error" | "timeout";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_MS = 60_000;
const SLOW_HINT_MS = 15_000;

const STATUS_TEXT: Record<Phase, string> = {
    triggering: "Sending request to AI…",
    polling: "Generating executive summary…",
    done: "Summary ready",
    error: "Couldn't generate summary",
    timeout: "Took too long — try again",
};

export function SummaryModal({ item, boardId, onClose }: Props) {
    const initialSummary = useRef("");
    const triggeredFor = useRef<string | null>(null);
    const [summary, setSummary] = useState<string>("");
    const [phase, setPhase] = useState<Phase>("polling");
    const [showSlowHint, setShowSlowHint] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let pollTimer: ReturnType<typeof setInterval> | null = null;
        let slowHintTimer: ReturnType<typeof setTimeout> | null = null;

        const stop = () => {
            if (pollTimer) clearInterval(pollTimer);
            if (slowHintTimer) clearTimeout(slowHintTimer);
        };

        (async () => {
            const current = await fetchItemSummary(item.id, boardId);
            if (cancelled) return;

            if (current) {
                initialSummary.current = current;
                setSummary(current);
                setPhase("done");
                return;
            }

            initialSummary.current = "";

            if (triggeredFor.current === item.id) return;
            triggeredFor.current = item.id;

            setPhase("triggering");
            try {
                await triggerSummaryGeneration(item.id, boardId);
            } catch (err) {
                if (cancelled) return;
                console.error("Failed to trigger n8n:", err);
                setPhase("error");
                return;
            }
            if (cancelled) return;

            setPhase("polling");
            const started = Date.now();
            slowHintTimer = setTimeout(() => {
                if (!cancelled) setShowSlowHint(true);
            }, SLOW_HINT_MS);

            pollTimer = setInterval(async () => {
                if (cancelled) return;
                try {
                    const latest = await fetchItemSummary(item.id, boardId);
                    if (cancelled) return;

                    const changed =
                        latest &&
                        latest !== initialSummary.current &&
                        latest.length > 0;
                    if (changed) {
                        setSummary(latest);
                        setPhase("done");
                        stop();
                        return;
                    }

                    if (Date.now() - started > MAX_POLL_MS) {
                        setPhase("timeout");
                        stop();
                    }
                } catch (err) {
                    console.error("Polling error (continuing):", err);
                }
            }, POLL_INTERVAL_MS);
        })();

        return () => {
            cancelled = true;
            stop();
        };
    }, [item.id, boardId]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const isLoading = phase === "triggering" || phase === "polling";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background-deep/80 backdrop-blur-sm p-6 summary-modal-backdrop"
            onClick={onClose}
        >
            <div
                className="glass-card rounded-xl p-8 max-w-2xl w-full summary-modal-card"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span
                            className={`summary-sparkle text-2xl ${isLoading ? "summary-sparkle-spinning" : ""}`}
                        >
                            ✦
                        </span>
                        <h2 className="text-headline-md text-text-primary">
                            {item.name}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded hover:bg-surface-variant"
                        aria-label="Close"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Status row */}
                <div className="flex items-center gap-2 mb-4 text-label-mono uppercase tracking-wider">
                    <span
                        className={`w-2 h-2 rounded-full ${
                            phase === "done"
                                ? "bg-status-completed shadow-[0_0_8px_#10B981]"
                                : phase === "error" || phase === "timeout"
                                  ? "bg-status-stuck shadow-[0_0_8px_#EF4444]"
                                  : "bg-primary shadow-[0_0_8px_#c3c0ff] animate-pulse"
                        }`}
                    />
                    <span
                        className={`text-xs ${
                            phase === "error" || phase === "timeout"
                                ? "text-error"
                                : "text-text-secondary"
                        }`}
                    >
                        {STATUS_TEXT[phase]}
                    </span>
                </div>

                {/* Body */}
                <div className="min-h-35">
                    {isLoading && (
                        <div className="summary-skeleton flex flex-col gap-3">
                            <div
                                className="h-4 rounded bg-surface-variant animate-pulse"
                                style={{ width: "92%" }}
                            />
                            <div
                                className="h-4 rounded bg-surface-variant animate-pulse"
                                style={{ width: "78%" }}
                            />
                            <div
                                className="h-4 rounded bg-surface-variant animate-pulse"
                                style={{ width: "85%" }}
                            />
                            <div
                                className="h-4 rounded bg-surface-variant animate-pulse"
                                style={{ width: "60%" }}
                            />
                            {showSlowHint && (
                                <p className="text-xs text-text-secondary italic mt-2 summary-slow-hint">
                                    This usually takes a few seconds. AI models
                                    can occasionally be slow under load.
                                </p>
                            )}
                        </div>
                    )}

                    {phase === "done" && (
                        <p className="summary-text text-body-md text-text-primary leading-relaxed whitespace-pre-wrap">
                            {summary}
                        </p>
                    )}

                    {(phase === "error" || phase === "timeout") && (
                        <div className="summary-text flex flex-col gap-4">
                            <p className="text-body-md text-text-secondary leading-relaxed">
                                {phase === "error"
                                    ? "We couldn't reach the AI workflow. Check your network and the n8n webhook configuration."
                                    : "The summary is taking longer than expected. The workflow may still be running — close this and try again in a moment."}
                            </p>
                            {summary && (
                                <div className="border-t border-outline-variant/30 pt-4">
                                    <div className="text-label-mono text-text-secondary uppercase tracking-wider mb-2">
                                        Last known summary
                                    </div>
                                    <p className="text-body-md text-text-secondary leading-relaxed">
                                        {summary}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
