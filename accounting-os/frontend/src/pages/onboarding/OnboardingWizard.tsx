import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import api from "@/api/client";
import { Check, ChevronRight, Loader2, Play } from "lucide-react";
import { useOrganization } from "@/context/OrganizationContext";

// Steps
const STEPS = [
    { id: 1, title: "Business Info", description: "Tell us about your company" },
    { id: 2, title: "Tax & Compliance", description: "GST and location details" },
    { id: 3, title: "Preferences", description: "Customize your experience" },
    { id: 4, title: "Review", description: "Confirm and get started" }
];

const BUSINESS_TYPES = ["Retail", "Service", "Trading", "Manufacturing", "Other"];
const STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Delhi", "Other"
];

const OnboardingWizard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { refreshOrg } = useOrganization();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        business_type: "",
        state: "",
        currency_symbol: "₹", // default
        fiscal_year_start: "04-01", // default
        gstin: "",
        email: "",
        website: "",
        features: {
            inventory: true,
            gst: true,
            cost_centers: false
        }
    });

    const handleNext = () => setStep(prev => Math.min(prev + 1, STEPS.length));
    const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.post("/onboarding/complete", formData);
            await refreshOrg(); // Refresh context to get new Org state
            toast({
                title: "Setup Complete!",
                description: "Welcome to your new Accounting OS.",
            });
            // Force reload or navigate
            navigate("/");
            window.location.reload(); // Safety to ensure all contexts re-init
        } catch (error: any) {
            console.error("Setup failed", error);
            const msg = error.response?.data?.detail || "Please check your inputs and try again.";
            toast({
                title: "Setup Failed",
                description: msg,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const updateFeature = (feature: string, value: boolean) => {
        setFormData(prev => ({
            ...prev,
            features: { ...prev.features, [feature]: value }
        }));
    };

    const renderStep1 = () => (
        <div className="space-y-4 animate-fade-in">
            <div className="space-y-2">
                <Label>Business Name</Label>
                <Input
                    value={formData.name}
                    onChange={e => updateField("name", e.target.value)}
                    placeholder="Acme Corp"
                />
            </div>
            <div className="space-y-2">
                <Label>Business Type</Label>
                <Select onValueChange={(val) => updateField("business_type", val)} value={formData.business_type}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                        {BUSINESS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>State (Location)</Label>
                <Select onValueChange={(val) => updateField("state", val)} value={formData.state}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                        {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-4 animate-fade-in">
            <div className="space-y-2">
                <Label>GSTIN (Optional)</Label>
                <Input
                    value={formData.gstin}
                    onChange={e => updateField("gstin", e.target.value)}
                    placeholder="22AAAAA0000A1Z5"
                />
            </div>
            <div className="space-y-2">
                <Label>Fiscal Year Start</Label>
                <Input
                    value={formData.fiscal_year_start}
                    onChange={e => updateField("fiscal_year_start", e.target.value)}
                    placeholder="MM-DD (e.g., 04-01)"
                />
            </div>
            <div className="space-y-2">
                <Label>Default Currency</Label>
                <Input
                    value={formData.currency_symbol}
                    onChange={e => updateField("currency_symbol", e.target.value)}
                    className="font-mono"
                />
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label className="text-base">Enable Inventory</Label>
                    <p className="text-sm text-muted-foreground">Track stock items and quantity.</p>
                </div>
                <Switch
                    checked={formData.features.inventory}
                    onCheckedChange={(checked) => updateFeature("inventory", checked)}
                />
            </div>
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label className="text-base">Enable GST Support</Label>
                    <p className="text-sm text-muted-foreground">GST calculation and reports.</p>
                </div>
                <Switch
                    checked={formData.features.gst}
                    onCheckedChange={(checked) => updateFeature("gst", checked)}
                />
            </div>
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label className="text-base">Cost Centers</Label>
                    <p className="text-sm text-muted-foreground">Track expenses by department/project.</p>
                </div>
                <Switch
                    checked={formData.features.cost_centers}
                    onCheckedChange={(checked) => updateFeature("cost_centers", checked)}
                />
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-4 animate-fade-in">
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Business:</span>
                    <span className="font-medium text-right">{formData.name}</span>

                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium text-right">{formData.business_type}</span>

                    <span className="text-muted-foreground">State:</span>
                    <span className="font-medium text-right">{formData.state}</span>

                    <span className="text-muted-foreground">Features:</span>
                    <span className="font-medium text-right">
                        {[
                            formData.features.inventory && "Inventory",
                            formData.features.gst && "GST",
                            formData.features.cost_centers && "Cost Centers"
                        ].filter(Boolean).join(", ") || "None"}
                    </span>
                </div>
            </div>
            <p className="text-center text-muted-foreground text-sm">
                Ready to initialize your business? You can change these settings later.
            </p>
        </div>
    );

    const isStepValid = () => {
        if (step === 1) return formData.name.length > 2 && formData.business_type && formData.state;
        return true;
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-xl">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        {STEPS.map((s, i) => (
                            <div key={s.id} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                    }`}>
                                    {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className={`w-12 h-1 mx-1 ${step > s.id ? "bg-primary" : "bg-muted"}`} />
                                )}
                            </div>
                        ))}
                    </div>
                    <CardTitle>{STEPS[step - 1].title}</CardTitle>
                    <CardDescription>{STEPS[step - 1].description}</CardDescription>
                </CardHeader>
                <CardContent className="min-h-[300px] flex flex-col justify-center">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleBack} disabled={step === 1 || loading}>
                        Back
                    </Button>
                    {step < 4 ? (
                        <Button onClick={handleNext} disabled={!isStepValid()}>
                            Next <ChevronRight className="ml-2 w-4 h-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                            Launch Accounting OS
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
};

export default OnboardingWizard;
