import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileText, Download, ChevronRight, ChevronDown } from "lucide-react";
import api from "@/api/client";
import { cn } from "@/lib/utils";

interface ReportLine {
    account_id: number;
    name: string;
    amount: number;
    level: number;
    is_header: boolean;
    children: ReportLine[];
}

interface PnLData {
    income: ReportLine[];
    expenses: ReportLine[];
    total_income: number;
    total_expense: number;
    net_profit: number;
}

const ReportTree = ({ lines }: { lines: ReportLine[] }) => {
    return (
        <div className="space-y-1">
            {lines.map(line => (
                <ReportRow key={line.account_id} line={line} />
            ))}
        </div>
    );
};

const ReportRow = ({ line }: { line: ReportLine }) => {
    const [expanded, setExpanded] = useState(true);

    return (
        <div className="text-sm">
            <div
                className={cn(
                    "flex items-center justify-between py-1 px-2 hover:bg-muted/50 rounded cursor-default",
                    line.is_header && "font-medium"
                )}
                style={{ paddingLeft: `${line.level * 1.5 + 0.5}rem` }}
                onClick={() => line.children.length > 0 && setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    {line.children.length > 0 && (
                        expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                    )}
                    <span>{line.name}</span>
                </div>
                <span>{line.amount !== 0 ? `₹${line.amount.toLocaleString()}` : '-'}</span>
            </div>
            {expanded && line.children.length > 0 && (
                <div className="border-l border-muted ml-4">
                    <ReportTree lines={line.children} />
                </div>
            )}
        </div>
    );
}

const Reports = () => {
    const [reportType, setReportType] = useState('pnl');
    const [pnlData, setPnlData] = useState<PnLData | null>(null);
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const generateReport = async () => {
        setLoading(true);
        try {
            if (reportType === 'pnl') {
                const res = await api.get(`/reports/pnl?start_date=${startDate}&end_date=${endDate}`);
                setPnlData(res.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
                    <p className="text-muted-foreground">Financial Statements & Analysis</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Report Type</label>
                            <select
                                className="flex h-10 w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                            >
                                <option value="pnl">Profit & Loss</option>
                                <option value="bs" disabled>Balance Sheet (Coming Soon)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">From</label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-[160px]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">To</label>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-[160px]" />
                        </div>
                        <Button onClick={generateReport} disabled={loading}>
                            {loading && <FileText className="mr-2 h-4 w-4 animate-spin" />}
                            {!loading && <FileText className="mr-2 h-4 w-4" />}
                            Run Report
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {pnlData && (
                <Card className="min-h-[500px]">
                    <CardHeader className="text-center border-b bg-muted/20">
                        <CardTitle>Profit & Loss Statement</CardTitle>
                        <CardDescription>
                            For the period {startDate} to {endDate}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        {/* Income Section */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 text-green-700">Income</h3>
                            <ReportTree lines={pnlData.income} />
                            <div className="flex justify-between border-t border-black mt-4 pt-2 font-bold text-base">
                                <span>Total Income</span>
                                <span>₹{pnlData.total_income.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Expense Section */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 text-red-700">Expenses</h3>
                            <ReportTree lines={pnlData.expenses} />
                            <div className="flex justify-between border-t border-black mt-4 pt-2 font-bold text-base">
                                <span>Total Expenses</span>
                                <span>₹{pnlData.total_expense.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Net Profit */}
                        <div className="border-t-2 border-black pt-4 flex justify-between text-xl font-bold bg-muted/30 p-4 rounded">
                            <span>Net Profit</span>
                            <span className={pnlData.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                ₹{pnlData.net_profit.toLocaleString()}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default Reports;
