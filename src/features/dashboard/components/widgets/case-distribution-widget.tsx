"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CaseStatusStat {
  status: string;
  count: number;
}

interface CaseDistributionWidgetProps {
  data: CaseStatusStat[];
  total: number;
}

const statusConfig: Record<string, { label: string; color: string; fill: string }> = {
  draft: { label: "Borrador", color: "bg-slate-200", fill: "#e2e8f0" },     // lighter slate
  in_progress: { label: "En Curso", color: "bg-blue-500", fill: "#3b82f6" },     // blue-500
  review: { label: "Revisión", color: "bg-amber-500", fill: "#f59e0b" },       // amber-500
  completed: { label: "Completado", color: "bg-green-500", fill: "#22c55e" },  // green-500
  archived: { label: "Archivado", color: "bg-slate-500", fill: "#64748b" }      // slate-500
};

export function CaseDistributionWidget({ data, total }: CaseDistributionWidgetProps) {
  // SVG Donut Logic
  const size = 160;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = 0;

  // Enhance data with colors and percents
  const chartData = data
    .filter(d => d.count > 0)
    .sort((a, b) => {
        // Sort order matching config keys for consistency
        const order = Object.keys(statusConfig);
        return order.indexOf(a.status) - order.indexOf(b.status);
    })
    .map(item => {
        const percent = item.count / total;
        const strokeLength = circumference * percent;
        const config = statusConfig[item.status] || { label: item.status, color: "bg-gray-300", fill: "#d1d5db" };
        
        const sector = {
            ...item,
            ...config,
            strokeLength,
            strokeDasharray: `${strokeLength} ${circumference}`,
            rotate: currentAngle * 360, // Rotate in degrees
        };
        
        currentAngle += percent;
        return sector;
    });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Estado de Expedientes</CardTitle>
        <CardDescription>Distribución de carga</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center space-y-6">
        
        {/* Donut Chart */}
        <div className="relative w-40 h-40">
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold tracking-tighter">{total}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</span>
            </div>

            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90 transform">
                {total === 0 ? (
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="transparent"
                        stroke="#f1f5f9" // slate-100
                        strokeWidth={strokeWidth}
                    />
                ) : (
                    chartData.map((sector, i) => (
                        <circle
                            key={sector.status}
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="transparent"
                            stroke={sector.fill}
                            strokeWidth={strokeWidth}
                            strokeDasharray={sector.strokeDasharray}
                            strokeDashoffset={0} // Offset handling is tricky in simple CSS rotation, using transform per circle
                            style={{ 
                                transformOrigin: 'center', 
                                transform: `rotate(${sector.rotate}deg)`,
                                transition: 'all 1s ease-out'
                            }}
                        />
                    ))
                )}
            </svg>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full text-xs">
            {chartData.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", item.color)} />
                        <span className="text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="font-medium">{item.count}</span>
                </div>
            ))}
            {total === 0 && <p className="text-muted-foreground col-span-2 text-center">Sin datos</p>}
        </div>

      </CardContent>
    </Card>
  );
}
