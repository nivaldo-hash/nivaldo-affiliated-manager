import { SeamlessApiClient } from "@mondaydotcomorg/api";
import { COLUMN_IDS } from "../config/columns";

const client = new SeamlessApiClient();

const buildQuery = (boardId: string) => `
  query {
    boards(ids: [${boardId}]) {
      id
      name
      items_page(limit: 100) {
        cursor
        items {
          id
          name
          subitems {
            id
            name
            state
            column_values {
              id
              text
              type
            }
          }
          column_values {
            id
            text
            type
            value
          }
        }
      }
    }
  }
`;

type RawColumnValue = {
    id: string;
    text: string | null;
    type: string;
    value: string | null;
};

type RawSubitem = {
    id: string;
    name: string;
    state: string;
    column_values: { id: string; text: string | null; type: string }[];
};

type RawItem = {
    id: string;
    name: string;
    subitems: RawSubitem[];
    column_values: RawColumnValue[];
};

type RawBoardResponse = {
    method: string;
    data: {
        data: {
            boards: {
                id: string;
                name: string;
                items_page: { cursor: string | null; items: RawItem[] };
            }[];
        };
    };
};

export type SubItem = {
    id: string;
    name: string;
    state: string;
    status: string | null;
};

export type ProjectItem = {
    id: string;
    name: string;
    type: string | null;
    lead: { id: number } | null;
    status: { label: string; index: number } | null;
    masterProject: string | null;
    mirrorPercent: number | null;
    value: number | null;
    assignmentDate: string | null;
    acknowledgmentDate: string | null;
    completionDate: string | null;
    executiveSummary: string | null;
    subitems: SubItem[];
};

export type BoardData = {
    id: string;
    name: string;
    items: ProjectItem[];
};

export type MondayUser = {
    id: string;
    name: string;
    firstName: string;
    email: string;
    photoUrl: string | null;
};

export const fetchMe = async (): Promise<MondayUser> => {
    type MeResponse = {
        method: string;
        data: {
            data: {
                me: {
                    id: string;
                    name: string;
                    email: string;
                    photo_thumb_small: string | null;
                };
            };
        };
    };

    const res = await client.request<MeResponse>(
        `query { me { id name email photo_thumb_small } }`,
    );
    const me = res.data?.data?.me;
    if (!me) throw new Error("Could not fetch current user");

    return {
        id: me.id,
        name: me.name,
        firstName: me.name.split(" ")[0] ?? me.name,
        email: me.email,
        photoUrl: me.photo_thumb_small,
    };
};

export type DiscoveredBoard = {
    id: string;
    name: string;
    /** Resolved column IDs keyed by their semantic name. Null when the board
      doesn't have that column at all. */
    columns: {
        executiveSummary: string | null;
    };
};
const boardColumnCache = new Map<string, DiscoveredBoard["columns"]>();

export const getBoardColumns = (
    boardId: string,
): DiscoveredBoard["columns"] | null => boardColumnCache.get(boardId) ?? null;

/**
 * Fetch all boards inside a monday folder, including each board's column
 * metadata so per-board column IDs (like executiveSummary, which differs
 * between boards) can be resolved at runtime.
 *
 * Every board in the folder is returned — there's no filtering on column
 * presence. If a board doesn't have an executive summary column, its entry
 * will have `executiveSummary: null` and downstream code handles that case.
 */
export const fetchAvailableBoards = async (
    folderId: string,
): Promise<DiscoveredBoard[]> => {
    type Resp = {
        method: string;
        data: {
            data: {
                folders: {
                    id: string;
                    name: string;
                    children: {
                        id: string;
                        name: string;
                        columns: { id: string; title: string; type: string }[];
                    }[];
                }[];
            };
        };
    };

    const res = await client.request<Resp>(
        `query {
      folders(ids: [${folderId}]) {
        id
        name
        children {
          id
          name
          columns { id title type }
        }
      }
    }`,
    );

    const boards = res.data?.data?.folders?.[0]?.children ?? [];
    const discovered: DiscoveredBoard[] = [];

    for (const b of boards) {
        // Still find the executive summary column when present — each board has
        // its own column ID, and the modal/parser need it for fetching content.
        // Boards without one just get null and the UI handles that gracefully.
        const summaryCol = b.columns.find(
            (c) =>
                c.type === "long_text" &&
                c.title.toLowerCase().includes("executive summary"),
        );

        const entry: DiscoveredBoard = {
            id: b.id,
            name: b.name,
            columns: { executiveSummary: summaryCol?.id ?? null },
        };

        boardColumnCache.set(b.id, entry.columns);
        discovered.push(entry);
    }

    return discovered;
};

const userCache = new Map<string, Promise<MondayUser>>();

type UsersResponse = {
    method: string;
    data: {
        data: {
            users: {
                id: string;
                name: string;
                email: string;
                photo_thumb_small: string | null;
            }[];
        };
    };
};

export const fetchUser = (userId: string | number): Promise<MondayUser> => {
    const id = String(userId);
    const cached = userCache.get(id);
    if (cached) return cached;

    const promise = client
        .request<UsersResponse>(
            `query { users(ids: [${id}]) { id name email photo_thumb_small } }`,
        )
        .then((res) => {
            const user = res.data?.data?.users?.[0];
            if (!user) throw new Error(`User ${id} not found`);
            return {
                id: user.id,
                name: user.name,
                firstName: user.name.split(" ")[0] ?? user.name,
                email: user.email,
                photoUrl: user.photo_thumb_small,
            };
        })
        .catch((err) => {
            userCache.delete(id);
            throw err;
        });
    userCache.set(id, promise);
    return promise;
};

export type SummaryTriggerPayload = {
    itemId: string;
    board: { id: string };
};

export const triggerSummaryGeneration = async (
    itemId: string,
    boardId: string,
): Promise<void> => {
    const url = import.meta.env.VITE_N8N_SUMMARY_WEBHOOK;
    if (!url) {
        throw new Error("Missing VITE_N8N_SUMMARY_WEBHOOK in .env.local");
    }
    const payload: SummaryTriggerPayload = {
        itemId,
        board: { id: boardId },
    };
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        throw new Error(`n8n webhook returned ${res.status}`);
    }
};
const resolveSummaryColId = async (boardId: string): Promise<string | null> => {
    // Reuse cache populated by fetchAvailableBoards if present
    const cached = boardColumnCache.get(boardId);
    if (cached) return cached.executiveSummary;

    type Resp = {
        method: string;
        data: {
            data: {
                boards: {
                    columns: { id: string; title: string; type: string }[];
                }[];
            };
        };
    };

    const res = await client.request<Resp>(
        `query { boards(ids: [${boardId}]) { columns { id title type } } }`,
    );
    const cols = res.data?.data?.boards?.[0]?.columns ?? [];
    const summaryCol = cols.find(
        (c) =>
            c.type === "long_text" &&
            c.title.toLowerCase().includes("executive summary"),
    );
    const id = summaryCol?.id ?? null;

    // Populate cache for subsequent calls (parseItem, polling, etc.)
    boardColumnCache.set(boardId, { executiveSummary: id });
    return id;
};

export const fetchItemSummary = async (
    itemId: string,
    boardId: string,
): Promise<string | null> => {
    const summaryColId = await resolveSummaryColId(boardId);
    if (!summaryColId) return null;
    type Resp = {
        method: string;
        data: {
            data: {
                items: {
                    column_values: { id: string; text: string | null }[];
                }[];
            };
        };
    };

    const res = await client.request<Resp>(
        `query {
      items(ids: [${itemId}]) {
        column_values(ids: ["${summaryColId}"]) {
          id
          text
        }
      }
    }`,
    );
    return res.data?.data?.items?.[0]?.column_values?.[0]?.text ?? null;
};

const findCol = (cols: RawColumnValue[], id: string) =>
    cols.find((c) => c.id === id);

const parseVal = <T>(raw: string | null | undefined): T | null => {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
};

const parseMirrorPercent = (raw?: string | null): number | null => {
    if (!raw) return null;
    const n = Number(raw.replace("%", "").trim());
    if (Number.isNaN(n)) return null;
    return n <= 1 ? Math.round(n * 100) : Math.round(n);
};

const parseItem = (raw: RawItem, boardId: string): ProjectItem => {
    const cols = raw.column_values;

    const summaryColId =
        boardColumnCache.get(boardId)?.executiveSummary ?? null;

    const typeCol = findCol(cols, COLUMN_IDS.type);
    const leadCol = findCol(cols, COLUMN_IDS.lead);
    const statusCol = findCol(cols, COLUMN_IDS.status);
    const masterCol = findCol(cols, COLUMN_IDS.masterProject);
    const mirrorCol = findCol(cols, COLUMN_IDS.mirror);
    const valueCol = findCol(cols, COLUMN_IDS.value);
    const assignCol = findCol(cols, COLUMN_IDS.assignmentDate);
    const ackCol = findCol(cols, COLUMN_IDS.acknowledgmentDate);
    const completeCol = findCol(cols, COLUMN_IDS.completionDate);
    const summaryCol = summaryColId ? findCol(cols, summaryColId) : undefined;

    const statusText = statusCol?.text ?? null;

    type PeopleVal = { personsAndTeams: { id: number; kind: string }[] };
    const people = parseVal<PeopleVal>(leadCol?.value);
    const lead = people?.personsAndTeams?.[0] ?? null;

    const numVal = parseVal<number>(valueCol?.value);

    type DateVal = { date: string };
    const assignDate = parseVal<DateVal>(assignCol?.value)?.date ?? null;
    const ackDate = parseVal<DateVal>(ackCol?.value)?.date ?? null;
    const completeDate = parseVal<DateVal>(completeCol?.value)?.date ?? null;

    return {
        id: raw.id,
        name: raw.name,
        type: typeCol?.text ?? null,
        lead: lead ? { id: lead.id } : null,
        status: statusText ? { label: statusText, index: 0 } : null,
        masterProject: masterCol?.text ?? null,
        mirrorPercent: parseMirrorPercent(mirrorCol?.text),
        value:
            typeof numVal === "number"
                ? numVal
                : numVal
                  ? Number(numVal)
                  : null,
        assignmentDate: assignDate,
        acknowledgmentDate: ackDate,
        completionDate: completeDate,
        executiveSummary: summaryCol?.text ?? null,
        subitems: (raw.subitems ?? []).map((sub) => ({
            id: sub.id,
            name: sub.name,
            state: sub.state,
            status:
                sub.column_values?.find((c) => c.type === "status")?.text ??
                null,
        })),
    };
};

export const fetchBoardData = async (boardId: string): Promise<BoardData> => {
    const data = await client.request<RawBoardResponse>(buildQuery(boardId));

    console.log("monday raw response:", JSON.stringify(data, null, 2));
    const board = data.data?.data?.boards?.[0];
    if (!board)
        throw new Error(
            `Board ${boardId} not found or not accessible — check BOARD_ID in columns.ts`,
        );

    return {
        id: board.id,
        name: board.name,
        items: (board.items_page?.items ?? []).map((item) =>
            parseItem(item, boardId),
        ),
    };
};
