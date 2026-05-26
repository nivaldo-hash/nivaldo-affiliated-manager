// Hardcoded board IDS from env.

export const BOARDS = {
    colorado: {
        id: import.meta.env.VITE_BOARD_COLORADO_ID as string,
        label: "Colorado Team",
    },
    michigan: {
        id: import.meta.env.VITE_BOARD_MICHIGAN_ID as string,
        label: "Michigan Team",
    },
} as const;

export type BoardKey = keyof typeof BOARDS;
export const DEFAULT_BOARD: BoardKey = "colorado";

// Column IDS
export const COLUMN_IDS = {
    type: "type",
    lead: "lead",
    status: "status",
    masterProject: "board_relation_mm3hkk3c",
    mirror: "lookup_mm3k5826",
    value: "value",
    assignmentDate: "assignment_date",
    acknowledgmentDate: "acknowledgment_date",
    completionDate: "completion_date",
    executiveSummary: {
        colorado: "long_text_mm3kpt39",
        michigan: "long_text_mm3k76wv",
    },
    subitems: "subtasks_mm3hzyjz",
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
