export const BOARD_ID = import.meta.env.VITE_BOARD_ID as string;

// Column IDS
export const COLUMN_IDS = {
    status: "status",
    executiveSummary: "long_text_mm3kpt39",
    location: "color_mm3q2bk",
    teamProject: "board_relation_mm3qbkxw",
    subitemOwner: "owner",
    subitemDueDate: "due_date",
} as const;

export const STATUS_LABELS = {
    ASSIGNED: "Assigned",
    ACKNOWLEDGED: "Acknowledged",
    IN_PROGRESS: "In progress",
    ON_HOLD: "On hold",
    COMPLETED: "Completed",
} as const;

export const STATUS_COLORS: Record<string, string> = {
    [STATUS_LABELS.ASSIGNED]: "#555555",
    [STATUS_LABELS.ACKNOWLEDGED]: "#703b9c",
    [STATUS_LABELS.IN_PROGRESS]: "#FDBC64",
    [STATUS_LABELS.ON_HOLD]: "#ad782d",
    [STATUS_LABELS.COMPLETED]: "#199461",
};

export const DEFAULT_STATUS_COLOR = "#555555";

export const LOCATIONS = ["Colorado", "Michigan"] as const;
export type Location = (typeof LOCATIONS)[number];
