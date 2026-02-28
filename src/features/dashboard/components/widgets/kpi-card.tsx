"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  trend: string;
  trendColor: string;
}

export function KpiCard({ title, value, icon, trend, trendColor }: KpiCardProps) {
  const isNumeric = typeof value === "number";

  return (
    <Card className="flex flex-col min-h-25 transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-5 pb-1 md:pb-1">
        <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium line-clamp-1 truncate">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="p-3 md:p-5 pt-0 flex-1 flex flex-col justify-end">
        <div className="text-3xl md:text-4xl font-bold tracking-tight tabular-nums">
          {isNumeric ? (
            <AnimatedNumber value={value as number} duration={700} />
          ) : (
            value
          )}
        </div>
        <p className={`text-[10px] md:text-xs font-medium mt-1.5 leading-tight ${trendColor}`}>
          {trend}
        </p>
      </CardContent>
    </Card>
  );
}
