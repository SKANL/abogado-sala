import { ClientForm } from "@/features/clients/components/client-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewClientPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Cliente</h1>
        <p className="text-muted-foreground">Registra un nuevo cliente o prospecto.</p>
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent>
              <ClientForm />
          </CardContent>
      </Card>
    </div>
  );
}
