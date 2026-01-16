import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
    title: string;
    value: string;
    icon: LucideIcon;
    variant?: "default" | "credit" | "debit" | "warning";
    subtitle?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
}

const variantStyles = {
    default: "bg-white border-gray-200 text-tally-blue",
    credit: "bg-green-50 border-green-200 text-green-700",
    debit: "bg-red-50 border-red-200 text-red-700",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
};

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon: Icon,
    variant = "default",
    subtitle,
    trend,
}) => {
    return (
        <div className={cn("border rounded-lg p-5 transition-all hover:shadow-md", variantStyles[variant])}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium opacity-80 mb-1">{title}</p>
                    <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
                </div>
                <div className={cn("p-2 rounded-full bg-white/50 backdrop-blur-sm")}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            {subtitle && (
                <div className="mt-4 flex items-center text-xs opacity-70">
                    {trend && (
                        <span className={cn("font-medium mr-2", trend.isPositive ? "text-green-600" : "text-red-600")}>
                            {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
                        </span>
                    )}
                    {subtitle}
                </div>
            )}
        </div>
    );
};
