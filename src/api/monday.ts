import { SeamlessApiClient } from "@mondaydotcomorg/api";
import { COLUMN_IDS } from "../config/columns";

const client = new SeamlessApiClient();

// ─── GraphQL query ──────────────────────────────────────────────────────────

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
              value
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

// ─── Raw response shapes ────────────────────────────────────────────────────

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
    column_values: RawColumnValue[];
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

// ─── App-shaped types ───────────────────────────────────────────────────────

export type SubItem = {
    id: string;
    name: string;
    state: string;
    status: string | null;
    ownerId: number | null;
    dueDate: string | null;
};

export type ProjectItem = {
    id: string;
    name: string;
    status: { label: string } | null;
    executiveSummary: string | null;
    location: string | null;
    teamProject: string | null;
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

// ─── fetchMe (welcome banner) ───────────────────────────────────────────────

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

// ─── fetchUser (owner avatars) ──────────────────────────────────────────────

/**
 * Cached lookup of any monday user by ID. Same person across many subitems
 * = one network call, all rows share the resolved promise.
 */
const userCache = new Map<string, Promise<MondayUser>>();

export const fetchUser = (userId: string | number): Promise<MondayUser> => {
    const id = String(userId);
    const cached = userCache.get(id);
    if (cached) return cached;

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

    const promise = client
        .request<UsersResponse>(
            `query { users(ids: [${id}]) { id name email photo_thumb_small } }`,
        )
        .then((res) => {
            const u = res.data?.data?.users?.[0];
            if (!u) throw new Error(`User ${id} not found`);
            return {
                id: u.id,
                name: u.name,
                firstName: u.name.split(" ")[0] ?? u.name,
                email: u.email,
                photoUrl: u.photo_thumb_small,
            };
        })
        .catch((err) => {
            userCache.delete(id);
            throw err;
        });

    userCache.set(id, promise);
    return promise;
};

// ─── n8n summary trigger ────────────────────────────────────────────────────

export const triggerSummaryGeneration = async (
    itemId: string,
    boardId: string,
): Promise<void> => {
    const url = import.meta.env.VITE_N8N_SUMMARY_WEBHOOK;
    if (!url) throw new Error("Missing VITE_N8N_SUMMARY_WEBHOOK in .env.local");

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, board: { id: boardId } }),
    });
    if (!res.ok) throw new Error(`n8n webhook returned ${res.status}`);
};

// ─── fetchItemSummary (polled by SummaryModal) ──────────────────────────────

export const fetchItemSummary = async (
    itemId: string,
): Promise<string | null> => {
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
        column_values(ids: ["${COLUMN_IDS.executiveSummary}"]) {
          id
          text
        }
      }
    }`,
    );
    return res.data?.data?.items?.[0]?.column_values?.[0]?.text ?? null;
};

// ─── Status mutation ────────────────────────────────────────────────────────

export const updateItemStatus = async (
    boardId: string,
    itemId: string,
    newStatus: string,
): Promise<void> => {
    await client.request(
        `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!) {
      change_simple_column_value(
        board_id: $boardId,
        item_id: $itemId,
        column_id: $columnId,
        value: $value
      ) { id }
    }`,
        { boardId, itemId, columnId: COLUMN_IDS.status, value: newStatus },
    );
};

// ─── Parser helpers ─────────────────────────────────────────────────────────

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

const parseItem = (raw: RawItem): ProjectItem => {
    const cols = raw.column_values;

    const statusCol = findCol(cols, COLUMN_IDS.status);
    const summaryCol = findCol(cols, COLUMN_IDS.executiveSummary);
    const locationCol = findCol(cols, COLUMN_IDS.location);
    const teamCol = findCol(cols, COLUMN_IDS.teamProject);

    const locationLabel = locationCol?.text || null;

    // Parse subitems — each has Owner (people), Status, and Due Date.
    type PeopleVal = { personsAndTeams: { id: number; kind: string }[] };
    type DateVal = { date: string };
    const subitems: SubItem[] = (raw.subitems ?? []).map((sub) => {
        const subCols = sub.column_values ?? [];
        const ownerCol = subCols.find((c) => c.id === COLUMN_IDS.subitemOwner);
        const dueCol = subCols.find((c) => c.id === COLUMN_IDS.subitemDueDate);
        const statusCol = subCols.find((c) => c.type === "status");
        const owner = parseVal<PeopleVal>(ownerCol?.value);
        const due = parseVal<DateVal>(dueCol?.value);
        return {
            id: sub.id,
            name: sub.name,
            state: sub.state,
            status: statusCol?.text || null,
            ownerId: owner?.personsAndTeams?.[0]?.id ?? null,
            dueDate: due?.date ?? null,
        };
    });

    return {
        id: raw.id,
        name: raw.name,
        status: statusCol?.text ? { label: statusCol.text } : null,
        executiveSummary: summaryCol?.text || null,
        location: locationLabel,
        teamProject: teamCol?.text || null,
        subitems,
    };
};

// ─── fetchBoardData ─────────────────────────────────────────────────────────

export const fetchBoardData = async (boardId: string): Promise<BoardData> => {
    const data = await client.request<RawBoardResponse>(buildQuery(boardId));

    const board = data.data?.data?.boards?.[0];
    if (!board) throw new Error(`Board ${boardId} not found or not accessible`);

    return {
        id: board.id,
        name: board.name,
        items: (board.items_page?.items ?? []).map(parseItem),
    };
};
