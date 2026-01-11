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
import { Plus, Gavel, AlertTriangle, Ban, CheckCircle2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Rule {
    id: number;
    name: string;
    description: string | null;
    event: string;
    target_voucher_type_id: number | null;
    condition: string;
    action: "block" | "warn" | "auto_correct";
    message: string | null;
}

interface VoucherType {
    id: number;
    name: string;
}

export default function Rules() {
    const [rules, setRules] = useState<Rule[]>([]);
    const [voucherTypes, setVoucherTypes] = useState<VoucherType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        event: "before_save",
        target_voucher_type_id: "all",
        condition: "",
        action: "block",
        message: ""
    });

    const fetchData = async () => {
        try {
            const [rulesRes, typesRes] = await Promise.all([
                api.get("/rules/"),
                api.get("/vouchers/types")
            ]);
            setRules(rulesRes.data);
            setVoucherTypes(typesRes.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load rules");
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
                ...formData,
                target_voucher_type_id: formData.target_voucher_type_id === "all" ? null : parseInt(formData.target_voucher_type_id)
            };

            await api.post("/rules/", payload);
            toast.success("Rule created successfully");
            setIsOpen(false);
            fetchData();
            setFormData({
                name: "",
                description: "",
                event: "before_save",
                target_voucher_type_id: "all",
                condition: "",
                action: "block",
                message: ""
            });
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed to create rule");
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Automation Rules</h2>
                    <p className="text-muted-foreground">
                        Define logic to validate, block, or warn on specific transactions.
                    </p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Rule
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Create Automation Rule</DialogTitle>
                            <DialogDescription>
                                Write a condition to enforce business logic.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Rule Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. Max Cash Limit"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="event">Trigger Event</Label>
                                    <Select
                                        value={formData.event}
                                        onValueChange={(val) => setFormData({ ...formData, event: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="before_save">Before Save</SelectItem>
                                            <SelectItem value="after_save">After Save (Async)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="target">Target Voucher Type</Label>
                                <Select
                                    value={formData.target_voucher_type_id}
                                    onValueChange={(val) => setFormData({ ...formData, target_voucher_type_id: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Vouchers (Global)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Check All Vouchers</SelectItem>
                                        {voucherTypes.map(v => (
                                            <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="condition" className="flex justify-between">
                                    <span>Condition (DSL)</span>
                                    <span className="text-xs text-muted-foreground font-normal">Python-like syntax</span>
                                </Label>
                                <Textarea
                                    id="condition"
                                    className="font-mono text-sm bg-muted/50"
                                    placeholder="e.g. amount > 10000 and ledger.name == 'Cash'"
                                    rows={3}
                                    value={formData.condition}
                                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Available variables: <code>amount</code>, <code>voucher_number</code>, <code>lines</code>.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="action">Action</Label>
                                    <Select
                                        value={formData.action}
                                        onValueChange={(val) => setFormData({ ...formData, action: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="block">Block Transaction</SelectItem>
                                            <SelectItem value="warn">Show Warning</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="message">Error Message</Label>
                                    <Input
                                        id="message"
                                        placeholder="e.g. Cash payment exceeeds limit!"
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="submit">Create Rule</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div>Loading...</div>
                ) : (
                    <div className="border rounded-lg bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Rule Name</TableHead>
                                    <TableHead>Target</TableHead>
                                    <TableHead>Trigger</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Condition</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rules.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            No rules defined.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rules.map((rule) => (
                                        <TableRow key={rule.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Gavel className="h-4 w-4 text-muted-foreground" />
                                                    {rule.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {rule.target_voucher_type_id ? voucherTypes.find(v => v.id === rule.target_voucher_type_id)?.name : <Badge variant="secondary">Global</Badge>}
                                            </TableCell>
                                            <TableCell className="text-xs font-mono">
                                                {rule.event}
                                            </TableCell>
                                            <TableCell>
                                                {rule.action === 'block' ? (
                                                    <Badge variant="destructive" className="flex w-fit gap-1"><Ban className="h-3 w-3" /> Block</Badge>
                                                ) : (
                                                    <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 flex w-fit gap-1"><AlertTriangle className="h-3 w-3" /> Warn</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs max-w-xs truncate" title={rule.condition}>
                                                {rule.condition}
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
