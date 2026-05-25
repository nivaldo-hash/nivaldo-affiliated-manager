// Hardcoded board IDS.

export const BOARDS = {
    colorado: { id: "18414062193", label: "Colorado Team" },
    michigan: { id: "18414062191", label: "Michigan Team" },
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
    executiveSummary: "long_text_mm3kpt39",
    subitems: "subtasks_mm3hzyjz",
} as const;

export const STATUS_LABELS = {
    ASSIGNED: "Assigned",
    ACKNOWLEDGED: "Acknowledged",
    IN_PROGRESS: "In Progress",
    ON_HOLD: "On Hold",
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
