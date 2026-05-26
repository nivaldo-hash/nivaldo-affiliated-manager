import { useEffect, useState } from "react";
import { fetchBoardData, type BoardData } from "../api/monday";

type State =
    | { status: "loading"; data: null; error: null }
    | { status: "ready"; data: BoardData; error: null }
    | { status: "error"; data: null; error: string };

export const useMondayBoard = (boardId: string): State => {
    const [state, setState] = useState<State>({
        status: "loading",
        data: null,
        error: null,
    });

    const [lastBoardId, setLastBoardId] = useState(boardId);

    if (boardId !== lastBoardId) {
        setLastBoardId(boardId);
        setState({ status: "loading", data: null, error: null });
    }

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const data = await fetchBoardData(boardId);
                if (cancelled) return;
                setState({ status: "ready", data, error: null });
            } catch (e) {
                if (cancelled) return;
                setState({
                    status: "error",
                    data: null,
                    error: e instanceof Error ? e.message : "Unknown error",
                });
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [boardId]);

    return state;
};
