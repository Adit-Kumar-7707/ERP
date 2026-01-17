import { useState, useEffect } from "react";
import api from "@/api/client";

export interface AccountGroup {
    id: number;
    name: string;
    parent_id?: number;
    balance_nature?: "Dr" | "Cr";
    parent?: AccountGroup;
}

export function useGroups() {
    const [groups, setGroups] = useState<AccountGroup[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchGroups = async () => {
        try {
            const res = await api.get("/accounting/groups");
            setGroups(res.data);
            setLoading(false);
        } catch (e) {
            console.error("Failed to load groups", e);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    return { groups, loading, fetchGroups };
}
