"use client";

import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CopyLinkButtonProps {
    token: string;
}

export function CopyLinkButton({ token }: CopyLinkButtonProps) {
    const handleCopy = () => {
        const portalUrl = `${window.location.origin}/sala/${token}`;
        navigator.clipboard.writeText(portalUrl);
        toast.success("Enlace copiado al portapapeles");
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                        <Copy className="mr-2 h-4 w-4" /> Copiar Link
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Copiar enlace para el cliente</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
