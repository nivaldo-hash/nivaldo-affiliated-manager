import { useEffect, useState } from "react";
import { fetchAvailableBoards, type DiscoveredBoard } from "../api/monday";

type State =
    | { status: "loading"; boards: null }
    | { status: "ready"; boards: DiscoveredBoard[] }
    | { status: "error"; boards: null; error: string };

const folderId = import.meta.env.VITE_MONDAY_FOLDER_ID;

export const useAvailableBoards = (): State => {
    const [state, setState] = useState<State>(() => {
        if (!folderId) {
            return {
                status: "error",
                boards: null,
                error: "Missing VITE_MONDAY_FOLDER_ID in .env.local",
            };
        }
        return {
            status: "loading",
            boards: null,
        };
    });

    useEffect(() => {
        if (!folderId) return;

        let cancelled = false;

        (async () => {
            try {
                const boards = await fetchAvailableBoards(String(folderId));
                if (!cancelled) setState({ status: "ready", boards });
            } catch (err) {
                if (!cancelled) {
                    setState({
                        status: "error",
                        boards: null,
                        error:
                            err instanceof Error
                                ? err.message
                                : "Failed to load boards",
                    });
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    return state;
};
