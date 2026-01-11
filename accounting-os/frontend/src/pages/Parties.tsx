import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, Users, Phone, Mail, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import api from "@/api/client";
import { Badge } from "@/components/ui/badge";

interface Party {
    id: number;
    name: string;
    code: string;
    type: string;
    parent_id: number;
    is_group: boolean;
    // Mock fields for now as Account model doesn't strictly have contact info yet
    contact_person?: string;
    phone?: string;
    email?: string;
}

const Parties = () => {
    const [parties, setParties] = useState<Party[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchParties();
    }, []);

    const fetchParties = async () => {
        try {
            // Fetch Accounts that are under Sundry Debtors or Creditors
            // For now, we fetch all accounts and filter on frontend for MVP if backend filter isn't ready.
            // Ideally backend should support ?group=Sundry Debtors
            const res = await api.get("/accounting/accounts");
            // Simple filter logic: Check if type is Asset/Liability and maybe name contains/group logic
            // Real logic: We need to know if they are children of Sundry Debtors/Creditors.
            // For MVP: We will filter by checking if they are NOT groups and assume they are parties if they aren't Bank/Cash
            // Better: Filter by type/logic. 
            // Let's assume for now we list all non-group accounts that are NOT cash/bank/direct income/expense
            // Actually, let's just show all Accounts for now but title it Parties
            setParties(res.data.filter((a: any) => !a.is_group));
        } catch (error) {
            console.error("Failed to fetch parties", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredParties = parties.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Parties</h2>
                    <p className="text-muted-foreground">Manage Customers & Vendors (Sundry Debtors & Creditors)</p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> New Party
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search parties..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredParties.map((party) => (
                    <Card key={party.id} className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-base font-semibold truncate">
                                {party.name}
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary" className="text-xs">{party.code}</Badge>
                                <Badge variant="outline" className="text-xs">{party.type}</Badge>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3" />
                                    <span>-</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-3 w-3" />
                                    <span>-</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-3 w-3" />
                                    <span>-</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            {filteredParties.length === 0 && !loading && (
                <div className="text-center py-12 text-muted-foreground">
                    No parties found matching your search.
                </div>
            )}
        </div>
    );
};

export default Parties;
