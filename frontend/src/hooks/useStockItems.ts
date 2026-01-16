import { useState, useEffect } from 'react';
import api from '@/api/client';

export interface StockItem {
    id: number;
    name: string;
    unit_id: number;
    hsn_code?: string;
    gst_rate?: number;
}

export function useStockItems() {
    const [items, setItems] = useState<StockItem[]>([]);

    const fetchItems = () => {
        api.get('/inventory/items')
            .then(res => setItems(res.data))
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchItems();
    }, []);

    return { items, refresh: fetchItems };
}
