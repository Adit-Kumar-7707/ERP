import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/api/client";
import { cn } from "@/lib/utils";

interface AlertItem {
  id: number;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  created_at: string;
}

export const AlertsWidget = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/analytics/alerts');
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const runScan = async () => {
    setLoading(true);
    try {
      await api.post('/analytics/alerts/scan');
      await fetchAlerts();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Business Alerts
          </CardTitle>
          <CardDescription>
            {alerts.length} active issues detected
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={runScan} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto space-y-4">
        {alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
            <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
            <p>All systems normal.</p>
          </div>
        )}
        {alerts.map(alert => (
          <div key={alert.id} className={cn(
            "p-3 rounded-lg border text-sm flex gap-3",
            alert.severity === 'critical' ? "bg-red-500/10 border-red-500/20" :
              alert.severity === 'warning' ? "bg-orange-500/10 border-orange-500/20" : "bg-muted"
          )}>
            {alert.severity === 'critical' ? <XCircle className="h-5 w-5 text-red-600 shrink-0" /> :
              alert.severity === 'warning' ? <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" /> :
                <div className="h-5 w-5 bg-blue-500 rounded-full" />}

            <div>
              <p className="font-medium">{alert.title}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{alert.message}</p>
              <p className="text-[10px] text-muted-foreground mt-2">
                {new Date(alert.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
