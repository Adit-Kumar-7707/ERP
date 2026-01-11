import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import api from "@/api/client";
import { Building2, Save } from "lucide-react";

export default function CompanyProfile() {
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        name: "",
        address: "",
        gstin: "",
        email: "",
        website: "",
        currency_symbol: "$",
        fiscal_year_start: "04-01" // Read-only usually
    });

    useEffect(() => {
        const fetchOrg = async () => {
            try {
                const res = await api.get("/organization/");
                const data = res.data;
                setFormData({
                    name: data.name || "",
                    address: data.address || "",
                    gstin: data.gstin || "",
                    email: data.email || "",
                    website: data.website || "",
                    currency_symbol: data.currency_symbol || "$",
                    fiscal_year_start: data.fiscal_year_start || "04-01"
                });
            } catch (err) {
                console.error(err);
                toast.error("Failed to load company details");
            } finally {
                setLoading(false);
            }
        };
        fetchOrg();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put("/organization/", formData);
            toast.success("Organization settings saved");
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed to save settings");
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">Company Profile</h2>
                <p className="text-muted-foreground">
                    Manage your organization's legal and contact details.
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            General Information
                        </CardTitle>
                        <CardDescription>
                            These details will appear on your invoices and reports.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Company Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gstin">Tax ID / GSTIN</Label>
                                <Input
                                    id="gstin"
                                    value={formData.gstin}
                                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                                    placeholder="e.g. 29AAAAA0000A1Z5"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Street address, City, State, Zip"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="accounts@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="website">Website</Label>
                                <Input
                                    id="website"
                                    value={formData.website}
                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                    placeholder="https://example.com"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency Symbol</Label>
                                <Input
                                    id="currency"
                                    className="w-20 font-mono"
                                    value={formData.currency_symbol}
                                    onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fiscal">Fiscal Year Start</Label>
                                <Input
                                    id="fiscal"
                                    value={formData.fiscal_year_start}
                                    disabled
                                    className="bg-muted text-muted-foreground"
                                />
                                <p className="text-xs text-muted-foreground">Cannot be changed after setup.</p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" className="gap-2">
                                <Save className="h-4 w-4" />
                                Save Changes
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
