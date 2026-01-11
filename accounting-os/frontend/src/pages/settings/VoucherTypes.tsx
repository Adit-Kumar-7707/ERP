import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Settings2, FileText, MoreHorizontal, Pencil, Trash } from "lucide-react";
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

interface VoucherType {
    id: number;
    name: string;
    type_group: string;
    prefix: string | null;
    sequence_type: "automatic" | "manual";
    current_sequence: number;
}

const TYPE_GROUPS = [
    "Sales",
    "Purchase",
    "Payment",
    "Receipt",
    "Journal",
    "Contra",
    "Credit Note",
    "Debit Note",
];

export default function VoucherTypes() {
    const [types, setTypes] = useState<VoucherType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        type_group: "",
        prefix: "",
        sequence_type: "automatic",
    });

    const fetchTypes = async () => {
        try {
            const res = await api.get("/vouchers/types");
            setTypes(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load voucher types");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTypes();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post("/vouchers/types", formData);
            toast.success("Voucher Type created successfully");
            setIsOpen(false);
            fetchTypes();
            // Reset
            setFormData({
                name: "",
                type_group: "",
                prefix: "",
                sequence_type: "automatic",
            });
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed to create voucher type");
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Voucher Types</h2>
                    <p className="text-muted-foreground">
                        Configure your accounting voucher series and numbering validation.
                    </p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Voucher Type
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Voucher Type</DialogTitle>
                            <DialogDescription>
                                Add a new type of voucher to categorization your transactions.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Export Sales"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="group">Parent Type</Label>
                                <Select
                                    value={formData.type_group}
                                    onValueChange={(val) => setFormData({ ...formData, type_group: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select parent group" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TYPE_GROUPS.map((group) => (
                                            <SelectItem key={group} value={group}>
                                                {group}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Determines the underlying accounting behavior.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="prefix">Prefix (Optional)</Label>
                                    <Input
                                        id="prefix"
                                        placeholder="e.g. EXP-"
                                        value={formData.prefix}
                                        onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="seq">Numbering Method</Label>
                                    <Select
                                        value={formData.sequence_type}
                                        onValueChange={(val) => setFormData({ ...formData, sequence_type: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="automatic">Automatic</SelectItem>
                                            <SelectItem value="manual">Manual</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="submit">Create Type</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4">
                {loading ? (
                    <div>Loading...</div>
                ) : (
                    <div className="border rounded-lg bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Parent Group</TableHead>
                                    <TableHead>Prefix</TableHead>
                                    <TableHead>Numbering</TableHead>
                                    <TableHead>Next No</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {types.map((type) => (
                                    <TableRow key={type.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                {type.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{type.type_group}</Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {type.prefix || "-"}
                                        </TableCell>
                                        <TableCell>{type.sequence_type}</TableCell>
                                        <TableCell className="font-mono">
                                            {type.sequence_type === 'automatic' ? type.current_sequence : "N/A"}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon">
                                                <Settings2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
}
