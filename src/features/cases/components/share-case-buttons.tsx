"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

// WhatsApp brand icon — no extra dependency needed
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current shrink-0" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const DEFAULT_TEMPLATE =
  "Hola {client_name} \u{1F44B}, te compartimos el enlace para acceder a tu expediente en el portal de *{org_name}*:\n\n{link}\n\nPor favor revisa los documentos y completa la información solicitada. ¡Estamos para apoyarte!";

function buildWhatsAppMessage(
  template: string,
  { clientName, orgName, link }: { clientName: string; orgName: string; link: string }
): string {
  return template
    .replace(/\{client_name\}/g, clientName)
    .replace(/\{org_name\}/g, orgName)
    .replace(/\{link\}/g, link);
}

interface ShareCaseButtonsProps {
  token: string;
  /** Client full name — used to personalise the WhatsApp message. */
  clientName?: string;
  /** Organisation name — used to personalise the WhatsApp message. */
  orgName?: string;
  /** Custom WhatsApp message template. Supports {client_name}, {org_name}, {link}. */
  whatsappTemplate?: string | null;
}

export function ShareCaseButtons({
  token,
  clientName = "Cliente",
  orgName = "el despacho",
  whatsappTemplate,
}: ShareCaseButtonsProps) {
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const portalUrl = `${origin}/sala/${token}`;

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

  const waMessage = buildWhatsAppMessage(whatsappTemplate ?? DEFAULT_TEMPLATE, {
    clientName,
    orgName,
    link: portalUrl,
  });
  const waHref = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className={cn(
          "gap-1.5 transition-all duration-300",
          copied && "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
        )}
        aria-label={copied ? "Enlace copiado" : "Copiar enlace del portal"}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" />
            ¡Copiado!
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copiar Link
          </>
        )}
      </Button>

      {/* WhatsApp deep-link — opens wa.me or the native app, no API key required */}
      <Button
        size="sm"
        variant="outline"
        asChild
        className="gap-1.5 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]"
      >
        <a href={waHref} target="_blank" rel="noopener noreferrer" aria-label="Enviar por WhatsApp">
          <WhatsAppIcon />
          WhatsApp
        </a>
      </Button>

      <Button size="sm" asChild>
        <Link href={`/sala/${token}`} target="_blank" rel="noopener noreferrer" className="gap-1.5">
          <ExternalLink className="h-3.5 w-3.5" />
          Ver Portal
        </Link>
      </Button>
    </>
  );
}
