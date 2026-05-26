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
    [STATUS_LABELS.ASSIGNED]: "#3B2FCF",
    [STATUS_LABELS.ACKNOWLEDGED]: "#F59E0B",
    [STATUS_LABELS.IN_PROGRESS]: "#1ECBE1",
    [STATUS_LABELS.ON_HOLD]: "#A1A1AA",
    [STATUS_LABELS.COMPLETED]: "#10B981",
};

export const DEFAULT_STATUS_COLOR = "#6B7280";

export const LOCATIONS = ["Colorado", "Michigan"] as const;
export type Location = (typeof LOCATIONS)[number];
