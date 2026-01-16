import { useState, useEffect } from "react";
import api from "@/api/client";

export interface SimpleLedger {
    id: number;
    name: string;
    parent_group: string;
    tax_type?: string;
    duty_head?: string;
}

export function useLedgers() {
    const [ledgers, setLedgers] = useState<SimpleLedger[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLedgers = () => {
        setLoading(true);
        api.get("/accounting/chart-of-accounts")
            .then(res => {
                const flat: SimpleLedger[] = [];

                // Recursive flattener
                const traverse = (groups: any[]) => {
                    groups.forEach(g => {
                        // Add Ledgers from this group
                        if (g.ledgers) {
                            g.ledgers.forEach((l: any) => {
                                flat.push({
                                    id: l.id,
                                    name: l.name,
                                    parent_group: g.name,
                                    tax_type: l.tax_type,
                                    duty_head: l.duty_head
                                });
                            });
                        }
                        // Recurse
                        traverse(g.children || []);
                    });
                };

                traverse(res.data);
                setLedgers(flat);
            })
            .catch(err => console.error("Failed to fetch ledgers", err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchLedgers();
    }, []);

    return { ledgers, loading, refresh: fetchLedgers };
}
