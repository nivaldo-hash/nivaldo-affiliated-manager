import { SeamlessApiClient } from "@mondaydotcomorg/api";
import { COLUMN_IDS } from "./columnsMap";

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

const parseItem = (raw: RawItem): ProjectItem => {
    const cols = raw.column_values;

    const typeCol = findCol(cols, COLUMN_IDS.type);
    const leadCol = findCol(cols, COLUMN_IDS.lead);
    const statusCol = findCol(cols, COLUMN_IDS.status);
    const masterCol = findCol(cols, COLUMN_IDS.masterProject);
    const mirrorCol = findCol(cols, COLUMN_IDS.mirror);
    const valueCol = findCol(cols, COLUMN_IDS.value);
    const assignCol = findCol(cols, COLUMN_IDS.assignmentDate);
    const ackCol = findCol(cols, COLUMN_IDS.acknowledgmentDate);
    const completeCol = findCol(cols, COLUMN_IDS.completionDate);
    const summaryCol = findCol(cols, COLUMN_IDS.executiveSummary);

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
        items: (board.items_page?.items ?? []).map(parseItem),
    };
};
