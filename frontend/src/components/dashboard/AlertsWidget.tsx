import {
    AlertTriangle,
    Info,
    XCircle,
    ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Alert {
    id: string;
    type: "error" | "warning" | "info";
    title: string;
    description: string;
    action_label?: string;
    action_href?: string;
    timestamp: string;
}

const alertStyles = {
    error: {
        bg: "bg-red-50 border-red-200",
        icon: XCircle,
        iconColor: "text-red-600",
    },
    warning: {
        bg: "bg-yellow-50 border-yellow-200",
        icon: AlertTriangle,
        iconColor: "text-yellow-600",
    },
    info: {
        bg: "bg-blue-50 border-blue-200",
        icon: Info,
        iconColor: "text-blue-600",
    },
};

export const AlertsWidget = ({ alerts }: { alerts: Alert[] }) => {
    if (!alerts || alerts.length === 0) {
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-tally-blue">Alerts & Actions</h2>
                <div className="p-4 border rounded-lg text-center text-gray-500 text-sm">
                    No active alerts. Good job!
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-tally-blue">Alerts & Actions</h2>
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                        {alerts.filter((a) => a.type === "error").length}
                    </span>
                </div>
            </div>

            <div className="space-y-2">
                {alerts.map((alert) => {
                    // Fallback if type is unknown
                    const style = alertStyles[alert.type as keyof typeof alertStyles] || alertStyles.info;
                    const Icon = style.icon;

                    return (
                        <div
                            key={alert.id}
                            className={cn(
                                "flex items-start gap-3 p-4 rounded-lg border transition-colors hover:bg-opacity-80",
                                style.bg
                            )}
                        >
                            <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", style.iconColor)} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-medium text-sm text-gray-900">{alert.title}</h4>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                        {alert.timestamp}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-0.5">
                                    {alert.description}
                                </p>
                                {alert.action_label && alert.action_href && (
                                    <Link to={alert.action_href} className="mt-2 text-sm font-medium text-blue-600 hover:underline inline-flex items-center gap-1">
                                        {alert.action_label}
                                        <ArrowRight className="h-3 w-3" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
