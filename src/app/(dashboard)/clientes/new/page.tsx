import { ClientForm } from "@/features/clients/components/client-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default function NewClientPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="Nuevo Cliente" description="Registra un nuevo cliente o prospecto." />
      
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
