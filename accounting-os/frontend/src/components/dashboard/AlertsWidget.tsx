import {
  AlertTriangle,
  Clock,
  Package,
  FileText,
  ArrowRight,
  XCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: "error" | "warning" | "info";
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  timestamp: string;
}

const alerts: Alert[] = [
  {
    id: "1",
    type: "error",
    title: "GST Return Overdue",
    description: "GSTR-3B for December 2024 is 5 days overdue",
    action: { label: "File Now", href: "/reports/gst" },
    timestamp: "2h ago",
  },
  {
    id: "2",
    type: "warning",
    title: "Negative Stock Detected",
    description: "3 items have negative stock: SKU-001, SKU-045, SKU-089",
    action: { label: "View Items", href: "/inventory/items" },
    timestamp: "4h ago",
  },
  {
    id: "3",
    type: "warning",
    title: "Receivables Overdue",
    description: "₹2,45,000 overdue from 8 parties for more than 30 days",
    action: { label: "View Parties", href: "/parties" },
    timestamp: "1d ago",
  },
  {
    id: "4",
    type: "info",
    title: "Bank Reconciliation Pending",
    description: "15 transactions pending reconciliation in HDFC Current Account",
    action: { label: "Reconcile", href: "/banking" },
    timestamp: "2d ago",
  },
];

const alertStyles = {
  error: {
    bg: "bg-destructive/5 border-destructive/20",
    icon: XCircle,
    iconColor: "text-destructive",
  },
  warning: {
    bg: "bg-warning/5 border-warning/20",
    icon: AlertTriangle,
    iconColor: "text-warning",
  },
  info: {
    bg: "bg-info/5 border-info/20",
    icon: Info,
    iconColor: "text-info",
  },
};

export const AlertsWidget = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Alerts & Actions</h2>
          <span className="px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive rounded-full">
            {alerts.filter((a) => a.type === "error").length}
          </span>
        </div>
        <button className="text-sm text-muted-foreground hover:text-foreground">
          Mark all as read
        </button>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => {
          const style = alertStyles[alert.type];
          const Icon = style.icon;

          return (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border transition-colors hover:bg-muted/50",
                style.bg
              )}
            >
              <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", style.iconColor)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-sm">{alert.title}</h4>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {alert.timestamp}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {alert.description}
                </p>
                {alert.action && (
                  <button className="mt-2 text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
                    {alert.action.label}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
