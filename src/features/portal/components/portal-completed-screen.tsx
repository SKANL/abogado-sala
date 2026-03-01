"use client";

import { CheckCircle2, Download, Phone, Mail, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface CompletedFile {
    name: string;
    url?: string;
}

interface PortalCompletedScreenProps {
    clientName: string;
    caseToken: string;
    orgName?: string;
    orgLogoUrl?: string;
    files?: CompletedFile[];
}

/**
 * Re-entry screen shown in the Client Portal when a case has been marked "completed".
 * Provides closure context and download access to any final documents.
 */
export function PortalCompletedScreen({
    clientName,
    caseToken,
    orgName,
    files = [],
}: PortalCompletedScreenProps) {
    const downloadableFiles = files.filter((f) => !!f.url);

    return (
        <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg space-y-6">
                {/* Header / branding */}
                <div className="text-center space-y-1">
                    {orgName && (
                        <p className="text-sm font-medium text-muted-foreground">{orgName}</p>
                    )}
                    <h1 className="text-2xl font-bold tracking-tight">Portal de Clientes</h1>
                </div>

                {/* Completion card */}
                <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
                    <CardHeader className="text-center pb-3">
                        <div className="flex justify-center mb-4">
                            <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 p-4">
                                <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                        <Badge variant="outline" className="w-fit mx-auto mb-2 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700">
                            Expediente Completado
                        </Badge>
                        <CardTitle className="text-xl">
                            ¡Tu trámite ha concluido, {clientName.split(" ")[0]}!
                        </CardTitle>
                        <CardDescription className="text-sm text-emerald-800/70 dark:text-emerald-300/80">
                            El equipo legal ha finalizado todos los trámites de tu expediente{" "}
                            <span className="font-mono font-semibold">{caseToken}</span>.
                            Gracias por tu confianza.
                        </CardDescription>
                    </CardHeader>

                    {downloadableFiles.length > 0 && (
                        <CardContent className="space-y-3">
                            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                                Documentos finales disponibles:
                            </p>
                            <ul className="space-y-2">
                                {downloadableFiles.map((file) => (
                                    <li key={file.name}>
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className="w-full justify-start gap-2 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                                        >
                                            <Link href={file.url!} target="_blank" rel="noopener noreferrer" download>
                                                <Download className="h-4 w-4" />
                                                {file.name}
                                            </Link>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    )}
                </Card>

                {/* Contact CTA */}
                <Card>
                    <CardContent className="pt-5">
                        <p className="text-sm text-center text-muted-foreground mb-4">
                            ¿Tienes alguna pregunta sobre tu expediente?
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            <Button variant="outline" size="sm" className="gap-2" disabled>
                                <Phone className="h-4 w-4" />
                                Llamar al despacho
                            </Button>
                            <Button variant="outline" size="sm" className="gap-2" disabled>
                                <MessageSquare className="h-4 w-4" />
                                Enviar mensaje
                            </Button>
                            <Button variant="outline" size="sm" className="gap-2" disabled>
                                <Mail className="h-4 w-4" />
                                Correo
                            </Button>
                        </div>
                        <p className="text-xs text-center text-muted-foreground mt-3">
                            Contacta directamente a través de los canales del despacho.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
