import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Package, Search } from "lucide-react";
import api from "@/api/client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface StockGroup {
    id: number;
    name: string;
}

interface UOM {
    id: number;
    name: string;
    symbol: string;
}

interface StockItem {
    id: number;
    name: string;
    part_number: string | null;
    group_id: number | null;
    uom_id: number | null;
    gst_rate: number;
    group?: StockGroup;
    uom?: UOM;
}

export default function StockItems() {
    const [items, setItems] = useState<StockItem[]>([]);
    const [groups, setGroups] = useState<StockGroup[]>([]);
    const [uoms, setUoms] = useState<UOM[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        part_number: "",
        group_id: "",
        uom_id: "",
        gst_rate: "0",
    });

    const fetchData = async () => {
        try {
            const [itemsRes, groupsRes, uomsRes] = await Promise.all([
                api.get("/inventory/items"),
                api.get("/inventory/groups"),
                api.get("/inventory/uoms")
            ]);
            setItems(itemsRes.data);
            setGroups(groupsRes.data);
            setUoms(uomsRes.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load inventory data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                part_number: formData.part_number || null,
                group_id: formData.group_id ? parseInt(formData.group_id) : null,
                uom_id: formData.uom_id ? parseInt(formData.uom_id) : null,
                gst_rate: parseFloat(formData.gst_rate)
            };

            await api.post("/inventory/items", payload);
            toast.success("Item created successfully");
            setIsOpen(false);
            fetchData();
            // Reset
            setFormData({
                name: "",
                part_number: "",
                group_id: "",
                uom_id: "",
                gst_rate: "0",
            });
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed to create item");
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.part_number && item.part_number.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Stock Items</h2>
                    <p className="text-muted-foreground">
                        Manage your product inventory, services, and stock levels.
                    </p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Item
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Create Stock Item</DialogTitle>
                            <DialogDescription>
                                Add a new product or service to your inventory masters.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Item Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Dell Monitor 24 inch"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="partNo">Part Number / SKU</Label>
                                <Input
                                    id="partNo"
                                    placeholder="e.g. DEL-MON-24"
                                    value={formData.part_number}
                                    onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="group">Stock Group</Label>
                                    <Select
                                        value={formData.group_id}
                                        onValueChange={(val) => setFormData({ ...formData, group_id: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Group" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {groups.map((g) => (
                                                <SelectItem key={g.id} value={g.id.toString()}>
                                                    {g.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="uom">Unit (UOM)</Label>
                                    <Select
                                        value={formData.uom_id}
                                        onValueChange={(val) => setFormData({ ...formData, uom_id: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Unit" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {uoms.map((u) => (
                                                <SelectItem key={u.id} value={u.id.toString()}>
                                                    {u.symbol} ({u.name})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="gst">GST Rate (%)</Label>
                                <Input
                                    id="gst"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={formData.gst_rate}
                                    onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                                />
                            </div>

                            <DialogFooter>
                                <Button type="submit">Create Item</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 max-w-sm">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search items..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div>Loading...</div>
                ) : (
                    <div className="border rounded-lg bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Part No</TableHead>
                                    <TableHead>Group</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead>GST</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            No items found. Create one above.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredItems.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Package className="h-4 w-4 text-muted-foreground" />
                                                    {item.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {item.part_number || "-"}
                                            </TableCell>
                                            <TableCell>
                                                {item.group_id ? groups.find(g => g.id === item.group_id)?.name : "-"}
                                                {/* Note: Ideally backend response includes relation, but manual lookup works for small lists */}
                                            </TableCell>
                                            <TableCell>
                                                {item.uom_id ? uoms.find(u => u.id === item.uom_id)?.symbol : "-"}
                                            </TableCell>
                                            <TableCell>
                                                {item.gst_rate}%
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
}
