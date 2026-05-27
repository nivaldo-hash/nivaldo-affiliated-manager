import { useEffect, useState } from "react";
import { fetchBoardData, type BoardData } from "../api/monday";
import { BOARD_ID } from "../config/columns";
console.log("BOARD_ID:", BOARD_ID);
type State =
    | { status: "loading"; data: null; error: null }
    | { status: "ready"; data: BoardData; error: null }
    | { status: "error"; data: null; error: string };

/** Fetches the hardcoded client-facing portal board on mount. */
export const useMondayBoard = (): State => {
    const [state, setState] = useState<State>({
        status: "loading",
        data: null,
        error: null,
    });

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const data = await fetchBoardData(BOARD_ID);
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
    }, []);

    return state;
};
