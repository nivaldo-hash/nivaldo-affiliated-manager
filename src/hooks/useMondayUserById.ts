import { useEffect, useState } from "react";
import { fetchUser, type MondayUser } from "../api/monday";

type State =
    | { status: "loading"; user: null }
    | { status: "ready"; user: MondayUser }
    | { status: "error"; user: null };

export const useMondayUserById = (id: string | number | null): State => {
    const [state, setState] = useState<State>({
        status: "loading",
        user: null,
    });

    useEffect(() => {
        if (id == null) return;
        let cancelled = false;
        (async () => {
            try {
                const user = await fetchUser(id);
                if (!cancelled) setState({ status: "ready", user });
            } catch {
                if (!cancelled) setState({ status: "error", user: null });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id]);
    return state;
};
