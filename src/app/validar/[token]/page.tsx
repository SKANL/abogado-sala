import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, FileText } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// Since this is a public page, we need to be careful about what we show.
// We should use a Service Role client or just a public RPC if RLS allows.
// Actually, RLS usually blocks public access to `cases`.
// We need a specific RPC `verify_case_token(token)` that returns limited info.
// OR we can use the `createClient` with admin privileges carefully in a server component?
// Better: standard Supabase Server Component with no cookie store (public anon). 
// But RLS will block `select * from cases`.
// SOLUTION: Create a public RPC `get_case_validation` in SQL.

/* 
  SQL Requirement (I will add this to a new migration file or run it):
  
  create or replace function public.validate_case_token(p_token text)
  returns table (
    found boolean,
    org_name text,
    client_name text,
    case_status text,
    created_at timestamptz
  ) 
  security definer -- Vital to bypass RLS
  as $$
  begin
    return query
    select 
      true as found,
      o.name as org_name,
      c.full_name as client_name,
      cse.status as case_status,
      cse.created_at
    from cases cse
    join organizations o on o.id = cse.org_id
    join clients c on c.id = cse.client_id
    where cse.token = p_token;
  end;
  $$ language plpgsql;
*/

// For the React component, I'll fetch data on the server.
import { createClient as createServerClient } from "@supabase/supabase-js"; // Direct backend client strictly for this

export default async function ValidationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  // Use Service Role for this specific read-only public check
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! 
  );

  // We can query directly since we have service role, but we must limit fields manually for security.
  const { data: caseData } = await supabase
    .from("cases")
    .select(`
        created_at, 
        status, 
        organizations (name, logo_url), 
        clients (full_name)
    `)
    .eq("token", token)
    .single();

  const isValid = !!caseData;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
            {isValid && Array.isArray(caseData.organizations) && caseData.organizations[0]?.logo_url && (
                <div className="mx-auto mb-4 relative w-24 h-24">
                     <Image 
                        src={caseData.organizations[0].logo_url} 
                        alt="Logo" 
                        fill 
                        className="object-contain"
                    />
                </div>
            )}
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                {isValid ? (
                    <>
                        <CheckCircle2 className="text-green-600 h-8 w-8" />
                        Expediente Válido
                    </>
                ) : (
                    <>
                        <XCircle className="text-red-600 h-8 w-8" />
                        Token Inválido
                    </>
                )}
            </CardTitle>
            <CardDescription>
                {isValid 
                    ? `Verificación de autenticidad del documento digital.` 
                    : "El código escaneado no corresponde a un expediente activo o ha expirado."}
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
            {isValid ? (
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm space-y-3">
                         <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                            <span className="text-muted-foreground text-sm">Despacho</span>
                            <span className="font-semibold text-gray-900">
                                {Array.isArray(caseData.organizations) ? caseData.organizations[0]?.name : ''}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                            <span className="text-muted-foreground text-sm">Cliente</span>
                            <span className="font-semibold text-gray-900">
                                {Array.isArray(caseData.clients) ? caseData.clients[0]?.full_name : ''}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                            <span className="text-muted-foreground text-sm">Estado</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                {caseData.status}
                            </span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-sm">Fecha de Inicio</span>
                            <span className="text-gray-900">
                                {new Date(caseData.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    
                    <div className="text-center">
                        <Link href="/" className="text-sm text-primary hover:underline">
                            Ir al Portal Principal
                        </Link>
                    </div>
                </div>
            ) : (
                 <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-center">
                    <p className="text-red-800 text-sm">
                        Si cree que esto es un error, por favor contacte directamente al despacho emisor.
                    </p>
                </div>
            )}
        </CardContent>
      </Card>
      
      <div className="mt-8 text-center text-xs text-gray-400">
         Verificado por <strong>NodusLegal</strong> • Plataforma Segura
      </div>
    </div>
  );
}
