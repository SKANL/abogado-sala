
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export function LiveActivityFeed() {
  return (
    <Card className="h-[400px] flex flex-col">
      <CardHeader>
        <CardTitle>Actividad en Tiempo Real</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[300px] px-6">
            <div className="space-y-4 py-4">
                {/* Placeholder for now. Needs Realtime subscription implementation */}
                <div className="flex items-center gap-4 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-muted-foreground">Sistema de auditoría activo.</p>
                </div>
                <p className="text-xs text-muted-foreground text-center py-4">
                    Esperando nuevos eventos...
                </p>
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
