import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileText, Download, ChevronRight, ChevronDown, Filter } from "lucide-react";
import api from "@/api/client";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// --- Types ---
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

interface TrialBalanceLine {
    account_id: number;
    account_name: string;
    type: string;
    debit: number;
    credit: number;
}

interface TrialBalanceData {
    lines: TrialBalanceLine[];
    total_debit: number;
    total_credit: number;
}

interface BalanceSheetData {
    assets: ReportLine[];
    liabilities: ReportLine[];
    equity: ReportLine[];
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
}

interface LedgerEntry {
    date: string;
    voucher_number: string;
    particulars: string;
    debit: number;
    credit: number;
    balance: number;
}

interface LedgerStatementData {
    account_name: string;
    opening_balance: number;
    entries: LedgerEntry[];
    closing_balance: number;
}

interface AccountOption {
    id: number;
    name: string;
    code: string;
}

// --- Components ---

const ReportTree = ({ lines }: { lines: ReportLine[] }) => {
    return (
        <div className="space-y-1">
            {lines.map((line, idx) => (
                <ReportRow key={`${line.account_id}-${idx}`} line={line} />
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
                    "flex items-center justify-between py-1 px-2 hover:bg-muted/50 rounded cursor-default transition-colors",
                    line.is_header && "font-medium"
                )}
                style={{ paddingLeft: `${line.level * 1.5 + 0.5}rem` }}
                onClick={() => line.children.length > 0 && setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    {line.children.length > 0 && (
                        expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={line.is_header ? "font-semibold" : ""}>{line.name}</span>
                </div>
                <span className="tabular-nums font-mono text-xs">{line.amount !== 0 ? `₹${line.amount.toLocaleString()}` : '-'}</span>
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
    const { type } = useParams();
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<any>(null);
    const [accounts, setAccounts] = useState<AccountOption[]>([]);

    // Filters
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>("");

    // Effect: Handle Type Change
    useEffect(() => {
        if (!type) {
            navigate('/reports/pnl');
        } else {
            setReportData(null);
            if (type === 'ledger') {
                fetchAccounts();
            } else {
                generateReport(); // Auto-fetch for non-ledger reports on load
            }
        }
    }, [type]);

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/accounting/accounts');
            setAccounts(res.data);
        } catch (err) {
            console.error("Failed to fetch accounts", err);
        }
    };

    const generateReport = async () => {
        if (type === 'ledger' && !selectedAccountId) return;

        setLoading(true);
        try {
            let url = '';
            let params = `?start_date=${startDate}&end_date=${endDate}`;

            switch (type) {
                case 'pnl': url = `/reports/pnl${params}`; break;
                case 'trial-balance': url = `/reports/trial-balance${params}`; break;
                case 'balance-sheet': url = `/reports/balance-sheet?end_date=${endDate}`; break; // BS uses end_date
                case 'ledger': url = `/reports/ledger?account_id=${selectedAccountId}&start_date=${startDate}&end_date=${endDate}`; break;
                default: url = `/reports/pnl${params}`;
            }

            const res = await api.get(url);
            setReportData(res.data);
        } catch (err) {
            console.error("Report fetch failed", err);
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    // --- Render Helpers ---

    const renderPnL = (data: PnLData) => (
        <CardContent className="p-8 space-y-8">
            <div>
                <h3 className="text-lg font-semibold mb-4 text-green-700">Income</h3>
                <ReportTree lines={data.income} />
                <div className="flex justify-between border-t border-black mt-4 pt-2 font-bold text-base">
                    <span>Total Income</span>
                    <span>₹{data.total_income.toLocaleString()}</span>
                </div>
            </div>
            <div>
                <h3 className="text-lg font-semibold mb-4 text-red-700">Expenses</h3>
                <ReportTree lines={data.expenses} />
                <div className="flex justify-between border-t border-black mt-4 pt-2 font-bold text-base">
                    <span>Total Expenses</span>
                    <span>₹{data.total_expense.toLocaleString()}</span>
                </div>
            </div>
            <div className="border-t-2 border-black pt-4 flex justify-between text-xl font-bold bg-muted/30 p-4 rounded">
                <span>Net Profit</span>
                <span className={data.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ₹{data.net_profit.toLocaleString()}
                </span>
            </div>
        </CardContent>
    );

    const renderTrialBalance = (data: TrialBalanceData) => (
        <CardContent className="p-0">
            <div className="border rounded-md">
                <div className="grid grid-cols-12 gap-4 p-4 font-semibold bg-muted border-b text-sm">
                    <div className="col-span-6">Account Name</div>
                    <div className="col-span-2 text-right">Debit</div>
                    <div className="col-span-2 text-right">Credit</div>
                    <div className="col-span-2">Type</div>
                </div>
                <div className="max-h-[600px] overflow-auto">
                    {data.lines.map((row) => (
                        <div key={row.account_id} className="grid grid-cols-12 gap-4 p-2 px-4 text-sm border-b hover:bg-muted/50">
                            <div className="col-span-6 font-medium">{row.account_name}</div>
                            <div className="col-span-2 text-right font-mono text-xs">{row.debit > 0 ? `₹${row.debit.toLocaleString()}` : '-'}</div>
                            <div className="col-span-2 text-right font-mono text-xs">{row.credit > 0 ? `₹${row.credit.toLocaleString()}` : '-'}</div>
                            <div className="col-span-2 text-xs text-muted-foreground truncate">{row.type}</div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-12 gap-4 p-4 font-bold bg-muted/20 border-t">
                    <div className="col-span-6">Total</div>
                    <div className="col-span-2 text-right">₹{data.total_debit.toLocaleString()}</div>
                    <div className="col-span-2 text-right">₹{data.total_credit.toLocaleString()}</div>
                    <div className="col-span-2"></div>
                </div>
            </div>
        </CardContent>
    );

    const renderBalanceSheet = (data: BalanceSheetData) => (
        <CardContent className="p-8 space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
                {/* Liabilities & Equity */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold border-b pb-2">Liabilities</h3>
                    <ReportTree lines={data.liabilities} />
                    <div className="flex justify-between font-semibold pt-2 border-t">
                        <span>Total Liabilities</span>
                        <span>₹{data.total_liabilities.toLocaleString()}</span>
                    </div>

                    <h3 className="text-lg font-bold border-b pb-2 pt-4">Equity</h3>
                    <ReportTree lines={data.equity} />
                    <div className="flex justify-between font-semibold pt-2 border-t">
                        <span>Total Equity</span>
                        <span>₹{data.total_equity.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between font-bold text-lg pt-4 border-t-2 border-black bg-muted/30 p-2 rounded">
                        <span>Total Liab. & Equity</span>
                        <span>₹{(data.total_liabilities + data.total_equity).toLocaleString()}</span>
                    </div>
                </div>

                {/* Assets */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold border-b pb-2">Assets</h3>
                    <ReportTree lines={data.assets} />
                    <div className="flex justify-between font-bold text-lg pt-4 border-t-2 border-black bg-muted/30 p-2 rounded mt-auto">
                        <span>Total Assets</span>
                        <span>₹{data.total_assets.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </CardContent>
    );

    const renderLedger = (data: LedgerStatementData) => (
        <CardContent className="p-0">
            <div className="p-4 bg-muted/20 border-b flex justify-between items-center">
                <div>
                    <p className="text-xs text-muted-foreground uppercase">Account</p>
                    <p className="font-bold text-lg">{data.account_name}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase">Closing Balance</p>
                    <p className={cn("font-bold text-lg font-mono", data.closing_balance < 0 ? "text-red-600" : "text-green-600")}>
                        ₹{data.closing_balance.toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="border rounded-md m-4">
                <div className="grid grid-cols-12 gap-4 p-3 font-semibold bg-muted border-b text-xs uppercase tracking-wider">
                    <div className="col-span-2">Date</div>
                    <div className="col-span-4">Particulars</div>
                    <div className="col-span-2 text-right">Debit</div>
                    <div className="col-span-2 text-right">Credit</div>
                    <div className="col-span-2 text-right">Balance</div>
                </div>
                <div className="max-h-[600px] overflow-auto">
                    {/* Opening Balance Row */}
                    <div className="grid grid-cols-12 gap-4 p-2 px-4 text-sm border-b bg-muted/10 italic">
                        <div className="col-span-6">Opening Balance</div>
                        <div className="col-span-2 text-right">-</div>
                        <div className="col-span-2 text-right">-</div>
                        <div className="col-span-2 text-right font-mono">₹{data.opening_balance.toLocaleString()}</div>
                    </div>

                    {data.entries.map((entry, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-4 p-2 px-4 text-sm border-b hover:bg-muted/50">
                            <div className="col-span-2 text-xs text-muted-foreground">
                                {entry.date}
                                <div className="text-[10px]">{entry.voucher_number}</div>
                            </div>
                            <div className="col-span-4">{entry.particulars}</div>
                            <div className="col-span-2 text-right font-mono text-xs text-red-600">{entry.debit > 0 ? entry.debit.toLocaleString() : '-'}</div>
                            <div className="col-span-2 text-right font-mono text-xs text-green-600">{entry.credit > 0 ? entry.credit.toLocaleString() : '-'}</div>
                            <div className="col-span-2 text-right font-mono text-xs font-medium">{entry.balance.toLocaleString()}</div>
                        </div>
                    ))}
                </div>
            </div>
        </CardContent>
    );

    const getTitle = () => {
        switch (type) {
            case 'pnl': return "Profit & Loss Statement";
            case 'trial-balance': return "Trial Balance";
            case 'balance-sheet': return "Balance Sheet";
            case 'ledger': return "Ledger Statement";
            case 'cash-flow': return "Cash Flow Statement (Beta)";
            default: return "Financial Report";
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{getTitle()}</h2>
                    <p className="text-muted-foreground">Generated on {new Date().toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-sm">Filter Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Report Type</label>
                            <select
                                className="flex h-10 w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                value={type}
                                onChange={(e) => navigate(`/reports/${e.target.value}`)}
                            >
                                <option value="pnl">Profit & Loss</option>
                                <option value="balance-sheet">Balance Sheet</option>
                                <option value="trial-balance">Trial Balance</option>
                                <option value="ledger">Ledger Statement</option>
                                <option value="cash-flow">Cash Flow</option>
                            </select>
                        </div>

                        {/* Date Range */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">From</label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-[140px]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">To</label>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-[140px]" />
                        </div>

                        {/* Ledger Specific: Account Selector */}
                        {type === 'ledger' && (
                            <div className="space-y-2 flex-1 min-w-[200px]">
                                <label className="text-sm font-medium">Select Account</label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={selectedAccountId}
                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                >
                                    <option value="">-- Choose Account --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <Button onClick={generateReport} disabled={loading} className="gap-2">
                            {loading ? <Filter className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
                            Run Report
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Results Area */}
            {reportData ? (
                <Card className="min-h-[500px]">
                    {type === 'pnl' && renderPnL(reportData)}
                    {type === 'trial-balance' && renderTrialBalance(reportData)}
                    {type === 'balance-sheet' && renderBalanceSheet(reportData)}
                    {type === 'ledger' && renderLedger(reportData)}
                    {/* Cash Flow Placeholder */}
                    {type === 'cash-flow' && (
                        <div className="p-8 text-center text-muted-foreground">
                            Cash Flow Statement Implementation is pending. Use Dashboard for visualized cash flow.
                        </div>
                    )}
                </Card>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-50" />
                    <p>Select criteria and run report to view data.</p>
                </div>
            )}
        </div>
    );
};

export default Reports;
