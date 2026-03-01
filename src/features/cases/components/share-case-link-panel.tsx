// no en uso actualmente - probablemente se use en algun futuro

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, ExternalLink, Link2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShareCaseLinkPanelProps {
  token: string;
  /** For future email sending once Resend is integrated */
  clientEmail?: string | null;
  /** ISO timestamp of last link send (for display) */
  lastSentAt?: string | null;
}

/**
 * Panel for sharing the client portal link.
 * Currently supports: copy to clipboard.
 * Email sending via Resend is scaffolded but deferred to a future sprint.
 */
export function ShareCaseLinkPanel({ token, lastSentAt }: ShareCaseLinkPanelProps) {
  const [copied, setCopied] = useState(false);

  const portalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/sala/${token}`
      : `/sala/${token}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      toast.success("Enlace copiado al portapapeles", {
        description: "Compártelo con tu cliente por WhatsApp, email o el canal que prefieras.",
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          Compartir con el cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* URL read-only input + copy button */}
        <div className="flex gap-2">
          <Input
            readOnly
            value={portalUrl}
            className="text-xs font-mono bg-muted/50 text-muted-foreground h-9"
            onClick={(e) => (e.target as HTMLInputElement).select()}
            aria-label="Enlace del portal del cliente"
          />
          <Button
            type="button"
            size="sm"
            variant={copied ? "default" : "outline"}
            onClick={handleCopy}
            className={cn(
              "shrink-0 gap-1.5 transition-all duration-300 h-9",
              copied && "bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
            )}
            aria-label={copied ? "Enlace copiado" : "Copiar enlace"}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span className="text-xs">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span className="text-xs hidden sm:inline">Copiar</span>
              </>
            )}
          </Button>
        </div>

        {/* Open portal in new tab */}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground h-8"
        >
          <a href={portalUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Ver como cliente
          </a>
        </Button>

        {/* Future email integration placeholder */}
        {/* 
          TODO: Once Resend is configured, replace this with:
          <Separator className="my-1" />
          <p className="text-xs text-muted-foreground text-center">— o enviar por email —</p>
          <EmailLinkForm caseToken={token} clientEmail={clientEmail} />
        */}

        {lastSentAt && (
          <p className="text-[11px] text-muted-foreground text-center">
            Último envío:{" "}
            {new Date(lastSentAt).toLocaleDateString("es", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
