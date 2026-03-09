"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, Activity } from "lucide-react";
import { PortalWizard } from "./portal-wizard";
import { CaseUpdatesTimeline, type CaseUpdateItem } from "@/features/cases/components/case-updates-timeline";
import type { CasePublic, PortalFile } from "@/features/portal/actions";

interface PortalTabsProps {
  token: string;
  initialCaseData: CasePublic["case"];
  clientName: string;
  files: PortalFile[];
  orgName?: string;
  orgLogoUrl?: string;
  orgConsentText?: string | null;
  initialUpdates: CaseUpdateItem[];
}

export function PortalTabs({
  token,
  initialCaseData,
  clientName,
  files,
  orgName,
  orgLogoUrl,
  orgConsentText,
  initialUpdates,
}: PortalTabsProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Tabs defaultValue="documents">
        <TabsList className="w-full grid grid-cols-2 h-10">
          <TabsTrigger value="documents" className="gap-1.5 text-sm">
            <FolderOpen className="h-4 w-4" />
            Mis Documentos
          </TabsTrigger>
          <TabsTrigger value="updates" className="gap-1.5 text-sm">
            <Activity className="h-4 w-4" />
            Estado del Caso
            {initialUpdates.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-semibold h-4.5 min-w-4.5 px-1">
                {initialUpdates.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4">
          <PortalWizard
            token={token}
            initialCaseData={initialCaseData}
            clientName={clientName}
            files={files}
            orgName={orgName}
            orgLogoUrl={orgLogoUrl}
            orgConsentText={orgConsentText}
          />
        </TabsContent>

        <TabsContent value="updates" className="mt-4">
          <div className="min-h-[200px] rounded-lg border p-4 bg-card">
            {/* Branding row (mirrors PortalWizard) */}
            {orgName && (
              <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                {orgLogoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={orgLogoUrl}
                    alt={orgName}
                    className="object-contain h-5 w-auto"
                  />
                )}
                <span className="text-sm font-medium text-muted-foreground">{orgName}</span>
              </div>
            )}
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Novedades de tu expediente
            </h2>
            <CaseUpdatesTimeline
              updates={initialUpdates}
              canDelete={false}
              emptyMessage="Tu abogado aún no ha publicado actualizaciones sobre tu expediente."
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
