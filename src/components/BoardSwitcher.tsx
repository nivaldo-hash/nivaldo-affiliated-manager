import { BOARDS, type BoardKey } from "./columnsMap";

type Props = {
    value: BoardKey;
    onChange: (key: BoardKey) => void;
    disabled?: boolean;
};

export function BoardSwitcher({ value, onChange, disabled }: Props) {
    return (
        <div className="board-switcher relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-primary pointer-events-none">
                groups
            </span>
            <select
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value as BoardKey)}
                className="appearance-none cursor-pointer pl-10 pr-9 py-2 rounded-full bg-primary-container/15 border border-primary-container/50 text-primary text-label-mono outline-none disabled:opacity-50 hover:bg-primary-container/25 transition-colors"
                style={{
                    boxShadow: "0 0 12px rgba(59, 47, 207, 0.25)",
                }}
            >
                {Object.entries(BOARDS).map(([key, { label }]) => (
                    <option
                        key={key}
                        value={key}
                        className="bg-surface-container text-text-primary"
                    >
                        {label}
                    </option>
                ))}
            </select>
            <span className="material-symbols-outlined text-[18px] text-primary absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                expand_more
            </span>
        </div>
    );
}
