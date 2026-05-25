import { useEffect, useState } from "react";
import { fetchMe, type MondayUser } from "./api";

type State =
    | { status: "loading"; user: null }
    | { status: "ready"; user: MondayUser }
    | { status: "error"; user: null };

export const useMondayUser = (): State => {
    const [state, setState] = useState<State>({
        status: "loading",
        user: null,
    });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const user = await fetchMe();
                if (!cancelled) setState({ status: "ready", user });
            } catch {
                if (!cancelled) setState({ status: "error", user: null });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return state;
};
