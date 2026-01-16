import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Gateway from "@/pages/Gateway";
import ChartOfAccounts from "@/pages/ChartOfAccounts";
import VoucherEntry from "@/pages/VoucherEntry";
import DayBook from "@/pages/DayBook";
import MasterCreate from "@/pages/masters/MasterCreate";
import LedgerCreate from "@/pages/masters/LedgerCreate";
import UnitCreate from "@/pages/masters/UnitCreate";
import StockGroupCreate from "@/pages/masters/StockGroupCreate";
import StockItemCreate from "@/pages/masters/StockItemCreate";
import BalanceSheet from "@/pages/BalanceSheet";
import StockSummary from "@/pages/StockSummary";
import ProfitLoss from "@/pages/ProfitLoss";
import GroupSummary from "@/pages/reports/GroupSummary";
import LedgerVouchers from "@/pages/reports/LedgerVouchers";
import Alter from "@/pages/Alter";
import LedgerAlter from "@/pages/masters/LedgerAlter";
import StockItemAlter from "@/pages/masters/StockItemAlter";
import UserCreate from "@/pages/masters/UserCreate";
import VoucherTypeAlter from "@/pages/masters/VoucherTypeAlter";
import InvoicePrint from "./pages/print/InvoicePrint";
import BankReconciliation from "./pages/BankReconciliation";
import Banking from "./pages/Banking";
import ImportData from "./pages/ImportData";
import Login from "@/pages/Login";
import RatioAnalysis from "@/pages/RatioAnalysis";
import CashFlow from "@/pages/CashFlow";
import Dashboard from "@/pages/Dashboard";
import TrialBalance from "./pages/TrialBalance";
import CompanySettings from "./pages/CompanySettings";

import { TallyProvider } from "@/context/TallyContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import CommandPalette from "@/components/CommandPalette";
import ShortcutHelp from "@/components/ShortcutHelp";

function ProtectedLayout() {
    const { isAuthenticated, user, logout } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    return (
        <div className="min-h-screen bg-tally-bg font-sans text-sm text-tally-text selection:bg-tally-blue selection:text-white">
            <CommandPalette />
            <ShortcutHelp />
            {/* Top Bar (Universal in Tally) */}
            <div className="h-12 bg-tally-yellow flex items-center px-4 justify-between shadow-sm border-b border-yellow-500 z-50 relative">
                <div className="font-bold text-lg tracking-tight">Accounting OS</div>
                <div className="flex gap-4 text-xs font-semibold items-center">
                    <span>Manage</span>
                    <span>Shop</span>
                    <span>Help</span>
                    <div className="h-6 w-px bg-yellow-600 mx-2"></div>
                    <span className="text-tally-blue font-bold">{user?.username}</span>
                    <button onClick={logout} className="hover:text-red-700">Logout</button>
                </div>
            </div>

            <div className="h-[calc(100vh-3rem)] flex">
                <div className="flex-1 overflow-hidden">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <TallyProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />

                        <Route element={<ProtectedLayout />}>
                            <Route path="/" element={<Gateway />} />
                            <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />
                            <Route path="/voucher-entry" element={<VoucherEntry />} />
                            <Route path="/day-book" element={<DayBook />} />
                            <Route path="/masters/create" element={<MasterCreate />} />
                            <Route path="/masters/ledger" element={<LedgerCreate />} />
                            <Route path="/masters/unit" element={<UnitCreate />} />
                            <Route path="/masters/stock-group" element={<StockGroupCreate />} />
                            <Route path="/masters/stock-item" element={<StockItemCreate />} />
                            <Route path="/masters/user" element={<UserCreate />} />
                            <Route path="/masters/voucher-type" element={<VoucherTypeAlter />} />
                            <Route path="/balance-sheet" element={<BalanceSheet />} />
                            <Route path="/report/trial-balance" element={<TrialBalance />} />
                            <Route path="/report/balance-sheet" element={<BalanceSheet />} />
                            <Route path="/report/profit-loss" element={<ProfitLoss />} />
                            <Route path="/stock-summary" element={<StockSummary />} />
                            <Route path="/pl" element={<ProfitLoss />} />
                            <Route path="/report/group/:groupName" element={<GroupSummary />} />
                            <Route path="/report/ledger/:ledgerId" element={<LedgerVouchers />} />
                            <Route path="/ratios" element={<RatioAnalysis />} />
                            <Route path="/cash-flow" element={<CashFlow />} />

                            {/* Transactions */}
                            <Route path="/voucher-entry" element={<VoucherEntry />} />
                            <Route path="/voucher-entry/:id" element={<VoucherEntry />} />

                            {/* Alteration */}
                            <Route path="/alter" element={<Alter />} />
                            <Route path="/alter/ledger" element={<LedgerAlter />} />
                            <Route path="/alter/item" element={<StockItemAlter />} />

                            {/* Settings */}
                            <Route path="/settings/company" element={<CompanySettings />} />

                            {/* Printing */}
                            <Route path="/print/invoice/:id" element={<InvoicePrint />} />
                            <Route path="/bank-reconcile/:ledgerId" element={<BankReconciliation />} />
                            {/* Banking */}
                            <Route path="/banking" element={<Banking />} />
                            {/* Import */}
                            <Route path="/import" element={<ImportData />} />
                            {/* Dashboard */}
                            <Route path="/dashboard" element={<Dashboard />} />
                        </Route>
                    </Routes>
                </TallyProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
