"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CopyLinkButtonProps {
    token: string;
}

export function CopyLinkButton({ token }: CopyLinkButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const portalUrl = `${window.location.origin}/sala/${token}`;
        navigator.clipboard.writeText(portalUrl).then(() => {
            setCopied(true);
            toast.success("Enlace copiado al portapapeles");
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        className="transition-all duration-200"
                    >
                        {copied ? (
                            <Check className="mr-2 h-4 w-4 text-emerald-600" />
                        ) : (
                            <Copy className="mr-2 h-4 w-4" />
                        )}
                        {copied ? "¡Copiado!" : "Copiar Link"}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Copiar enlace del portal para el cliente</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
