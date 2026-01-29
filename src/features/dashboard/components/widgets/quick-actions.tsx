
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, FolderPlus } from "lucide-react";
import Link from "next/link";

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <Link href="/clientes/nuevo">
            <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:border-primary hover:text-primary transition-colors">
                <UserPlus className="w-6 h-6" />
                <span>Nuevo Cliente</span>
            </Button>
        </Link>
        <Link href="/casos/nuevo">
            <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:border-primary hover:text-primary transition-colors">
                <FolderPlus className="w-6 h-6" />
                <span>Nuevo Expediente</span>
            </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
