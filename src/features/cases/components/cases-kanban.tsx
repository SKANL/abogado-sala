"use client";

import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent,
    useDroppable,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GripVertical, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { updateCaseAction } from "../actions";

type CaseStatus = "draft" | "in_progress" | "review" | "completed";

interface KanbanCase {
    id: string;
    token: string;
    status: CaseStatus;
    client: { full_name: string } | null;
    created_at: string;
}

interface CasesKanbanProps {
    cases: KanbanCase[];
}

const COLUMNS: { id: CaseStatus; label: string; color: string; headerClass: string }[] = [
    { id: "draft", label: "Borrador", color: "text-muted-foreground", headerClass: "border-t-border" },
    { id: "in_progress", label: "En Progreso", color: "text-blue-600 dark:text-blue-400", headerClass: "border-t-blue-500" },
    { id: "review", label: "En Revisión", color: "text-amber-600 dark:text-amber-400", headerClass: "border-t-amber-500" },
    { id: "completed", label: "Completado", color: "text-emerald-600 dark:text-emerald-400", headerClass: "border-t-emerald-500" },
];

// ─── Droppable Column ─────────────────────────────────────────────────────────

function KanbanColumn({
    column,
    cases,
    isOver,
}: {
    column: (typeof COLUMNS)[number];
    cases: KanbanCase[];
    isOver: boolean;
}) {
    const { setNodeRef } = useDroppable({ id: column.id });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex flex-col gap-2 min-h-50 rounded-xl p-3 bg-muted/40 border-t-2 transition-colors",
                column.headerClass,
                isOver && "bg-muted/70 ring-2 ring-primary/30"
            )}
        >
            <div className="flex items-center justify-between mb-1 px-1">
                <span className={cn("text-xs font-semibold uppercase tracking-wide", column.color)}>
                    {column.label}
                </span>
                <Badge variant="secondary" className="text-xs h-5 min-w-5 justify-center">
                    {cases.length}
                </Badge>
            </div>

            <SortableContext items={cases.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                {cases.map((c) => (
                    <KanbanCard key={c.id} caseItem={c} />
                ))}
            </SortableContext>

            {cases.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-xs text-muted-foreground/60 italic">Sin expedientes</p>
                </div>
            )}
        </div>
    );
}

// ─── Sortable Card ────────────────────────────────────────────────────────────

function KanbanCard({ caseItem, overlay = false }: { caseItem: KanbanCase; overlay?: boolean }) {
    const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
        id: caseItem.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-all overflow-hidden",
                isDragging && "opacity-40",
                overlay && "shadow-xl rotate-1 opacity-95"
            )}
        >
            <div className="flex items-start gap-2 min-w-0">
                {/* Drag handle */}
                <button
                    {...attributes}
                    {...listeners}
                    className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0 touch-none"
                    tabIndex={-1}
                >
                    <GripVertical className="h-4 w-4" />
                </button>

                <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium leading-tight truncate">
                        {caseItem.client?.full_name ?? "Sin cliente"}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{caseItem.token}</p>
                </div>

                {/* Link to case detail */}
                <Link
                    href={`/casos/${caseItem.id}`}
                    className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    title="Abrir expediente"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                </Link>
            </div>
        </div>
    );
}

// ─── Main Kanban Board ────────────────────────────────────────────────────────

export function CasesKanban({ cases: initialCases }: CasesKanbanProps) {
    const router = useRouter();
    const [cases, setCases] = useState<KanbanCase[]>(initialCases);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overColumnId, setOverColumnId] = useState<CaseStatus | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    const activeCase = cases.find((c) => c.id === activeId);

    const getCasesForColumn = (status: CaseStatus) =>
        cases.filter((c) => c.status === status);

    // Determine which column a dragged item is hovering over
    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        if (!over) { setOverColumnId(null); return; }
        const overId = over.id as string;
        const isColumn = COLUMNS.some((col) => col.id === overId);
        if (isColumn) {
            setOverColumnId(overId as CaseStatus);
        } else {
            // Hovering over a card — find the card's column
            const overCase = cases.find((c) => c.id === overId);
            if (overCase) setOverColumnId(overCase.status);
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setOverColumnId(null);
        if (!over) return;

        const activeCase = cases.find((c) => c.id === active.id);
        if (!activeCase) return;

        // Determine target column
        const overId = over.id as string;
        const targetColumn = COLUMNS.find((col) => col.id === overId)?.id
            ?? cases.find((c) => c.id === overId)?.status;

        if (!targetColumn || targetColumn === activeCase.status) return;

        // Optimistic update
        setCases((prev) =>
            prev.map((c) => (c.id === activeCase.id ? { ...c, status: targetColumn } : c))
        );

        // Persist to server
        const fd = new FormData();
        fd.append("case_id", activeCase.id);
        fd.append("status", targetColumn);
        const result = await updateCaseAction(null, fd);

        if (!result.success) {
            // Rollback
            setCases((prev) =>
                prev.map((c) => (c.id === activeCase.id ? { ...c, status: activeCase.status } : c))
            );
            toast.error("No se pudo actualizar el estado");
        } else {
            toast.success(`Movido a ${COLUMNS.find((col) => col.id === targetColumn)?.label}`);
            router.refresh();
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {COLUMNS.map((col) => (
                    <KanbanColumn
                        key={col.id}
                        column={col}
                        cases={getCasesForColumn(col.id)}
                        isOver={overColumnId === col.id}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeCase ? <KanbanCard caseItem={activeCase} overlay /> : null}
            </DragOverlay>
        </DndContext>
    );
}
