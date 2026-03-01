"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ShareCaseButtonsProps {
  token: string;
}

export function ShareCaseButtons({ token }: ShareCaseButtonsProps) {
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

      <Button size="sm" asChild>
        <Link href={`/sala/${token}`} target="_blank" rel="noopener noreferrer" className="gap-1.5">
          <ExternalLink className="h-3.5 w-3.5" />
          Ver Portal
        </Link>
      </Button>
    </>
  );
}
