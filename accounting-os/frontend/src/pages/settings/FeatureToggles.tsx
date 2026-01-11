import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import api from "@/api/client";
import { ToggleLeft, Save, Package, Building2, Receipt } from "lucide-react";

export default function FeatureToggles() {
    const [loading, setLoading] = useState(true);
    const [features, setFeatures] = useState({
        inventory: false,
        gst: false,
        cost_centers: false,
        multi_currency: false
    });

    useEffect(() => {
        const fetchOrg = async () => {
            try {
                const res = await api.get("/organization/");
                // Ensure features object exists, default to false if key missing
                const f = res.data.features || {};
                setFeatures({
                    inventory: !!f.inventory,
                    gst: !!f.gst,
                    cost_centers: !!f.cost_centers,
                    multi_currency: !!f.multi_currency
                });
            } catch (err) {
                console.error(err);
                toast.error("Failed to load settings");
            } finally {
                setLoading(false);
            }
        };
        fetchOrg();
    }, []);

    const handleToggle = (key: string, checked: boolean) => {
        setFeatures(prev => ({ ...prev, [key]: checked }));
    };

    const handleSubmit = async () => {
        try {
            // Send FULL features object to merge
            await api.put("/organization/", { features: features });
            toast.success("Features updated successfully");
            // Ideally trigger a global refresh or reload to update Sidebar
            setTimeout(() => window.location.reload(), 1000);
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed to update features");
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">Feature Toggles</h2>
                <p className="text-muted-foreground">
                    Enable or disable modules to customize your workspace.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ToggleLeft className="h-5 w-5" />
                        Available Modules
                    </CardTitle>
                    <CardDescription>
                        Turn off unused features to simplify the interface.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    <div className="flex items-center justify-between space-x-4 border p-4 rounded-lg">
                        <div className="flex items-center space-x-4">
                            <div className="bg-primary/10 p-2 rounded-full">
                                <Package className="h-5 w-5 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-base">Inventory Management</Label>
                                <p className="text-sm text-muted-foreground">
                                    Track stock items, groups, and units. Enable for trading/manufacturing.
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={features.inventory}
                            onCheckedChange={(c) => handleToggle('inventory', c)}
                        />
                    </div>

                    <div className="flex items-center justify-between space-x-4 border p-4 rounded-lg">
                        <div className="flex items-center space-x-4">
                            <div className="bg-primary/10 p-2 rounded-full">
                                <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-base">Cost Centers</Label>
                                <p className="text-sm text-muted-foreground">
                                    Allocate expenses to specific projects, departments, or branches.
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={features.cost_centers}
                            onCheckedChange={(c) => handleToggle('cost_centers', c)}
                        />
                    </div>

                    <div className="flex items-center justify-between space-x-4 border p-4 rounded-lg">
                        <div className="flex items-center space-x-4">
                            <div className="bg-primary/10 p-2 rounded-full">
                                <Receipt className="h-5 w-5 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-base">Goods & Services Tax (GST)</Label>
                                <p className="text-sm text-muted-foreground">
                                    Enable GST calculation on vouchers and generate tax reports.
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={features.gst}
                            onCheckedChange={(c) => handleToggle('gst', c)}
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSubmit} className="gap-2">
                            <Save className="h-4 w-4" />
                            Save Preferences
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
