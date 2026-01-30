"use client";

import { useState } from "react";
import { MoreVertical, Archive, Trash2, RotateCcw, CheckCircle, FileArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteCaseAction, updateCaseAction, finalizeCaseAction, requestZipExportAction } from "../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CaseActionsProps {
    caseId: string;
    currentStatus: string;
}

export function CaseActionsDropdown({ caseId, currentStatus }: CaseActionsProps) {
    const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setLoading(true);
        try {
            const result = await deleteCaseAction(caseId);
            if (result.success) {
                toast.success("Expediente eliminado correctamente");
                router.push("/casos");
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Error al eliminar el expediente");
        } finally {
            setLoading(false);
        }
    };

    const handleArchive = async (archive: boolean) => {
        setLoading(true);
        const newStatus = archive ? 'archived' : 'draft'; 
        
        try {
            const formData = new FormData();
            formData.append("case_id", caseId);
            formData.append("status", newStatus);

            const result = await updateCaseAction(null, formData);
            if (result.success) {
                toast.success(archive ? "Expediente archivado" : "Expediente restaurado");
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Error al actualizar estado");
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async () => {
        setLoading(true);
        try {
            const result = await finalizeCaseAction(caseId);
            if (result.success) {
                toast.success("Expediente finalizado", {
                    description: "La descarga del ZIP se ha puesto en cola."
                });
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Error al finalizar");
        } finally {
            setLoading(false);
        }
    };

    const handleExportZip = async () => {
        setLoading(true);
        try {
            const result = await requestZipExportAction(caseId);
            if (result.success) {
                toast.success("Solicitud enviada", {
                    description: "Se te notificará cuando el archivo esté listo."
                });
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Error al solicitar exportación");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={loading}>
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Acciones</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Gestionar Expediente</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {currentStatus === 'archived' ? (
                         <DropdownMenuItem onClick={() => handleArchive(false)}>
                            <RotateCcw className="mr-2 h-4 w-4" /> Restaurar (Borrador)
                        </DropdownMenuItem>
                    ) : (
                        <>
                            {currentStatus !== 'completed' ? (
                                <DropdownMenuItem onClick={handleFinalize} className="text-blue-600 focus:text-blue-700">
                                    <FileArchive className="mr-2 h-4 w-4" /> Finalizar y Descargar
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem onClick={handleExportZip}>
                                    <FileArchive className="mr-2 h-4 w-4" /> Exportar ZIP
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleArchive(true)}>
                                <Archive className="mr-2 h-4 w-4" /> Archivar
                            </DropdownMenuItem>
                        </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => setOpenDeleteAlert(true)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar Permanentemente
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={openDeleteAlert} onOpenChange={setOpenDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente el expediente y 
                            <strong> todos sus archivos asociados</strong> de nuestros servidores.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={loading}
                        >
                            {loading ? "Eliminando..." : "Sí, Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
