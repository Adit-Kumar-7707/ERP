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
import { Plus, Building2, Search } from "lucide-react";
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

interface CostCenter {
    id: number;
    name: string;
    code: string | null;
    parent_id: number | null;
}

export default function CostCenters() {
    const [items, setItems] = useState<CostCenter[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        parent_id: "none",
    });

    const fetchData = async () => {
        try {
            const res = await api.get("/masters/cost-centers");
            setItems(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load cost centers");
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
                code: formData.code || null,
                parent_id: formData.parent_id === "none" ? null : parseInt(formData.parent_id),
            };

            await api.post("/masters/cost-centers", payload);
            toast.success("Cost Center created successfully");
            setIsOpen(false);
            fetchData();
            setFormData({ name: "", code: "", parent_id: "none" });
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed to create cost center");
        }
    };

    const filteredItems = items.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.code && i.code.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Cost Centers</h2>
                    <p className="text-muted-foreground">
                        Manage cost allocation centers (Projects, Departments).
                    </p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Cost Center
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Cost Center</DialogTitle>
                            <DialogDescription>
                                Add a new cost center for tracking expenses.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Marketing Dept"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="code">Code (Optional)</Label>
                                <Input
                                    id="code"
                                    placeholder="e.g. MKT-01"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="parent">Parent Category</Label>
                                <Select
                                    value={formData.parent_id}
                                    onValueChange={(val) => setFormData({ ...formData, parent_id: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select parent..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Primary (No Parent)</SelectItem>
                                        {items.map((i) => (
                                            <SelectItem key={i.id} value={i.id.toString()}>
                                                {i.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <DialogFooter>
                                <Button type="submit">Create Cost Center</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 max-w-sm">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search..."
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
                                    <TableHead>Code</TableHead>
                                    <TableHead>Parent</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                            No cost centers found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredItems.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                    {item.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {item.code || "-"}
                                            </TableCell>
                                            <TableCell>
                                                {item.parent_id ? items.find(i => i.id === item.parent_id)?.name : "Primary"}
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
