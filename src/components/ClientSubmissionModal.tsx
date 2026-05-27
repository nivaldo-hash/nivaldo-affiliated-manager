import { useEffect, useRef, useState } from "react";
import {
    triggerClientSubmission,
    type ClientSubmissionPayload,
    type ProjectItem,
} from "../api/monday";

type Props = {
    item: ProjectItem;
    boardId: string;
    onClose: () => void;
};

type Phase = "form" | "submitting" | "success" | "error";

type FormState = {
    name: string;
    company: string;
    email: string;
    phone: string;
    message: string;
};

const EMPTY_FORM: FormState = {
    name: "",
    company: "",
    email: "",
    phone: "",
    message: "",
};

export function ClientSubmissionModal({ item, boardId, onClose }: Props) {
    const [phase, setPhase] = useState<Phase>("form");
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [error, setError] = useState<string | null>(null);
    const firstInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        firstInputRef.current?.focus();
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const set = (field: keyof FormState) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => setForm((f) => ({ ...f, [field]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim()) return;

        setPhase("submitting");
        setError(null);

        const payload: ClientSubmissionPayload = {
            projectId: item.id,
            projectName: item.name,
            boardId,
            client: {
                name: form.name.trim(),
                company: form.company.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                message: form.message.trim(),
            },
        };

        try {
            await triggerClientSubmission(payload);
            setPhase("success");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
            setPhase("error");
        }
    };

    const labelClass =
        "block text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-1";
    const inputClass =
        "w-full bg-surface-container/50 border border-outline-variant/40 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background-deep/80 backdrop-blur-sm p-6"
            onClick={onClose}
        >
            <div
                className="glass-card rounded-xl p-8 max-w-lg w-full"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-primary text-[20px]">
                                notification_important
                            </span>
                            <h2 className="text-headline-md text-text-primary">
                                Client Submission
                            </h2>
                        </div>
                        <p className="text-xs text-text-secondary font-mono truncate max-w-xs">
                            Project: {item.name}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded hover:bg-surface-variant"
                        aria-label="Close"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Success state */}
                {phase === "success" && (
                    <div className="flex flex-col items-center gap-4 py-8 text-center">
                        <span className="material-symbols-outlined text-status-completed text-5xl">
                            check_circle
                        </span>
                        <div>
                            <p className="text-body-md text-text-primary font-medium mb-1">
                                Submission sent
                            </p>
                            <p className="text-sm text-text-secondary">
                                The assigned Project Manager has been notified.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="mt-2 px-6 py-2 rounded-lg bg-primary-container text-primary text-sm font-mono font-bold tracking-wider hover:bg-primary/10 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                )}

                {/* Error state */}
                {phase === "error" && (
                    <div className="flex flex-col items-center gap-4 py-6 text-center">
                        <span className="material-symbols-outlined text-error text-4xl">
                            error
                        </span>
                        <div>
                            <p className="text-body-md text-text-primary font-medium mb-1">
                                Submission failed
                            </p>
                            <p className="text-xs text-text-secondary font-mono break-all">
                                {error}
                            </p>
                        </div>
                        <button
                            onClick={() => setPhase("form")}
                            className="px-6 py-2 rounded-lg border border-outline-variant/40 text-sm font-mono text-text-primary hover:bg-surface-container/60 transition-colors"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Form */}
                {(phase === "form" || phase === "submitting") && (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>
                                    Client name <span className="text-error">*</span>
                                </label>
                                <input
                                    ref={firstInputRef}
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={set("name")}
                                    placeholder="Jane Doe"
                                    className={inputClass}
                                    disabled={phase === "submitting"}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Company</label>
                                <input
                                    type="text"
                                    value={form.company}
                                    onChange={set("company")}
                                    placeholder="ACME Corp"
                                    className={inputClass}
                                    disabled={phase === "submitting"}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>
                                    Email <span className="text-error">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={set("email")}
                                    placeholder="jane@acme.com"
                                    className={inputClass}
                                    disabled={phase === "submitting"}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Phone</label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={set("phone")}
                                    placeholder="+1 555 000 0000"
                                    className={inputClass}
                                    disabled={phase === "submitting"}
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Message / Notes</label>
                            <textarea
                                value={form.message}
                                onChange={set("message")}
                                placeholder="Describe the submission or any updates…"
                                rows={4}
                                className={`${inputClass} resize-none`}
                                disabled={phase === "submitting"}
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant/20">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={phase === "submitting"}
                                className="px-4 py-2 rounded-lg text-sm font-mono text-text-secondary hover:text-text-primary hover:bg-surface-variant transition-colors disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    phase === "submitting" ||
                                    !form.name.trim() ||
                                    !form.email.trim()
                                }
                                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white text-sm font-mono font-bold tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(47,98,233,0.3)]"
                            >
                                {phase === "submitting" ? (
                                    <>
                                        <span className="material-symbols-outlined text-[16px] animate-spin">
                                            progress_activity
                                        </span>
                                        Sending…
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[16px]">
                                            send
                                        </span>
                                        Notify PM
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
