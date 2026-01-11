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
import { Plus, Layers, Search } from "lucide-react";
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

interface StockGroup {
    id: number;
    name: string;
    parent_id: number | null;
}

export default function StockGroups() {
    const [groups, setGroups] = useState<StockGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        parent_id: "none",
    });

    const fetchGroups = async () => {
        try {
            const res = await api.get("/inventory/groups");
            setGroups(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load stock groups");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                parent_id: formData.parent_id === "none" ? null : parseInt(formData.parent_id),
            };

            await api.post("/inventory/groups", payload);
            toast.success("Stock Group created successfully");
            setIsOpen(false);
            fetchGroups();
            setFormData({ name: "", parent_id: "none" });
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed to create group");
        }
    };

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Stock Groups</h2>
                    <p className="text-muted-foreground">
                        Organize items into categories and sub-categories.
                    </p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Group
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Stock Group</DialogTitle>
                            <DialogDescription>
                                Define a category to grouping stock items.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Group Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Electronics"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="parent">Parent Group (Optional)</Label>
                                <Select
                                    value={formData.parent_id}
                                    onValueChange={(val) => setFormData({ ...formData, parent_id: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select parent..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Primary (No Parent)</SelectItem>
                                        {groups.map((g) => (
                                            <SelectItem key={g.id} value={g.id.toString()}>
                                                {g.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <DialogFooter>
                                <Button type="submit">Create Group</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 max-w-sm">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search groups..."
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
                                    <TableHead>Parent Group</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredGroups.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">
                                            No groups found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredGroups.map((group) => (
                                        <TableRow key={group.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Layers className="h-4 w-4 text-muted-foreground" />
                                                    {group.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {group.parent_id ? groups.find(g => g.id === group.parent_id)?.name : "Primary"}
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
