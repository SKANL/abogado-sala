"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CopyableFieldProps {
  /** The text to copy to clipboard */
  value: string;
  /** Optional label shown before the value */
  label?: string;
  /** Display format: "inline" shows text + button, "button" shows only a button with label */
  variant?: "inline" | "button";
  /** Optional tooltip text when hovering the copy button */
  tooltip?: string;
  className?: string;
}

/**
 * Reusable click-to-copy field with visual feedback.
 * Used for invitation links, portal tokens, etc.
 */
export function CopyableField({
  value,
  label,
  variant = "inline",
  tooltip = "Copiar",
  className,
}: CopyableFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [value]);

  if (variant === "button") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className={cn("gap-2 shrink-0", className)}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {label && <span>{copied ? "¡Copiado!" : label}</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? "¡Copiado!" : tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2",
        className
      )}
    >
      {label && (
        <span className="text-xs font-medium text-muted-foreground shrink-0">
          {label}:
        </span>
      )}
      <code className="flex-1 text-xs font-mono truncate select-all">
        {value}
      </code>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span className="sr-only">{copied ? "Copiado" : "Copiar"}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? "¡Copiado!" : tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
