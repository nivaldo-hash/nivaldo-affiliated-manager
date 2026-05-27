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

type NextPageResponse = {
    method: string;
    data: {
        data: {
            next_items_page: { cursor: string | null; items: RawItem[] };
        };
    };
};

const buildNextPageQuery = (cursor: string) => `
  query {
    next_items_page(limit: 100, cursor: "${cursor}") {
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
`;

// ─── App-shaped types ───────────────────────────────────────────────────────

export type SubItem = {
    id: string;
    name: string;
    state: string;
    status: string | null;
    /** Labels valid for this subitem's status column. Shared across all subitems
      on the same parent board (one subitem-board per parent). */
    statusOptions: string[];
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

// ─── n8n client submission trigger ──────────────────────────────────────────

export type ClientSubmissionPayload = {
    projectId: string;
    projectName: string;
    boardId: string;
    client: {
        name: string;
        company: string;
        email: string;
        phone: string;
        message: string;
    };
};

export const triggerClientSubmission = async (
    payload: ClientSubmissionPayload,
): Promise<void> => {
    const url = import.meta.env.VITE_N8N_CLIENT_SUBMISSION_WEBHOOK;
    if (!url)
        throw new Error("Missing VITE_N8N_CLIENT_SUBMISSION_WEBHOOK in .env");

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`n8n webhook returned ${res.status}`);
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

/**
 * Update a subitem's status. Subitems live on their own auto-generated board
 * with a distinct status column, so we resolve the board ID + column ID at
 * call time by querying the subitem itself.
 */
export const updateSubitemStatus = async (
    subitemId: string,
    newStatus: string,
): Promise<void> => {
    type Resp = {
        method: string;
        data: {
            data: {
                items: {
                    board: { id: string };
                    column_values: { id: string; type: string }[];
                }[];
            };
        };
    };

    const meta = await client.request<Resp>(
        `query {
      items(ids: [${subitemId}]) {
        board { id }
        column_values { id type }
      }
    }`,
    );

    const item = meta.data?.data?.items?.[0];
    const boardId = item?.board?.id;
    const statusCol = item?.column_values?.find((c) => c.type === "status");

    if (!boardId || !statusCol) {
        throw new Error(
            `Couldn't resolve board / status column for subitem ${subitemId}`,
        );
    }

    // Interpolate values directly — same pattern as buildQuery (SeamlessApiClient
    // doesn't reliably forward GraphQL $variables).
    await client.request(
        `mutation {
      change_simple_column_value(
        board_id: ${boardId},
        item_id: ${subitemId},
        column_id: "${statusCol.id}",
        value: "${newStatus.replace(/"/g, '\\"')}"
      ) { id }
    }`,
    );
};

/**
 * Fetch the status labels defined on the subitem board associated with this
 * parent board. Subitem boards have their own status definitions independent
 * of the parent — this lets the UI offer only labels monday will accept.
 *
 * Returns an empty array on any failure so the UI gracefully degrades.
 */
const fetchSubitemStatusOptions = async (
    parentBoardId: string,
): Promise<string[]> => {
    type Resp = {
        method: string;
        data: {
            data: {
                boards: {
                    items_page: {
                        items: {
                            subitems: {
                                board: {
                                    columns: {
                                        id: string;
                                        type: string;
                                        settings_str: string;
                                    }[];
                                };
                            }[];
                        }[];
                    };
                }[];
            };
        };
    };

    try {
        // Pull a larger page and scan for the first item with subitems — item 0
        // might have none, but item 17 might. We only need to find one to extract
        // the subitem board's columns (they're shared across all subitems).
        const res = await client.request<Resp>(
            `query {
        boards(ids: [${parentBoardId}]) {
          items_page(limit: 100) {
            items {
              subitems {
                board {
                  columns { id type settings_str }
                }
              }
            }
          }
        }
      }`,
        );

        const items = res.data?.data?.boards?.[0]?.items_page?.items ?? [];
        const itemWithSubs = items.find(
            (it) => it.subitems && it.subitems.length > 0,
        );

        if (!itemWithSubs) {
            console.warn(
                "No items with subitems found — can't discover subitem status options",
            );
            return [];
        }

        const cols = itemWithSubs.subitems[0]?.board?.columns;
        if (!cols) return [];

        const statusCol = cols.find((c) => c.type === "status");
        if (!statusCol?.settings_str) return [];

        const settings = JSON.parse(statusCol.settings_str) as {
            labels?: Record<string, string>;
        };
        return settings.labels ? Object.values(settings.labels) : [];
    } catch (err) {
        console.warn("Could not fetch subitem status options:", err);
        return [];
    }
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

const parseItem = (
    raw: RawItem,
    subitemStatusOptions: string[],
): ProjectItem => {
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
            statusOptions: subitemStatusOptions, // shared across all subitems
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
    // Fetch the main board data and subitem status options in parallel.
    const [data, subitemStatusOptions] = await Promise.all([
        client.request<RawBoardResponse>(buildQuery(boardId)),
        fetchSubitemStatusOptions(boardId),
    ]);

    const board = data.data?.data?.boards?.[0];
    if (!board) throw new Error(`Board ${boardId} not found or not accessible`);

    const allRaw: RawItem[] = [...(board.items_page?.items ?? [])];
    let cursor = board.items_page?.cursor ?? null;

    while (cursor) {
        const next = await client.request<NextPageResponse>(
            buildNextPageQuery(cursor),
        );
        const page = next.data?.data?.next_items_page;
        allRaw.push(...(page?.items ?? []));
        cursor = page?.cursor ?? null;
    }

    return {
        id: board.id,
        name: board.name,
        items: allRaw.map((item) => parseItem(item, subitemStatusOptions)),
    };
};
