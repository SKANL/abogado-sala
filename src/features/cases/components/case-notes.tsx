"use client";

import React, { useActionState, useEffect, useRef, useState } from "react";
import { addCaseNoteAction, deleteCaseNoteAction } from "@/features/cases/actions/notes-and-assignee";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Loader2, Send, Trash2, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Result } from "@/types";

interface NoteAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface CaseNote {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author?: NoteAuthor | null;
}

interface CaseNotesProps {
  caseId: string;
  initialNotes: CaseNote[];
  currentUserId: string;
  /** Owner/admin can delete any note; members can only delete their own */
  canDeleteAll?: boolean;
}

const initialState: Result<unknown> = { success: false, error: "" };

export function CaseNotes({
  caseId,
  initialNotes,
  currentUserId,
  canDeleteAll = false,
}: CaseNotesProps) {
  const [notes, setNotes] = useState<CaseNote[]>(initialNotes);
  const [state, formAction, isPending] = useActionState(addCaseNoteAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle action result
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      // The revalidatePath in the action will refresh notes via RSC
    } else if (!state.success && state.error) {
      toast.error(state.error);
    }
  }, [state]);

  // Auto-scroll to bottom when new notes appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [notes.length]);

  // Sync initialNotes when RSC refreshes
  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const handleDelete = async (noteId: string) => {
    const result = await deleteCaseNoteAction(noteId);
    if (result.success) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success("Nota eliminada");
    } else {
      toast.error(result.error || "Error al eliminar la nota");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Notes list */}
      <ScrollArea className="h-[400px] pr-1" ref={scrollRef as React.Ref<HTMLDivElement>}>
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <StickyNote className="h-8 w-8 opacity-40" />
            <div className="text-center">
              <p className="text-sm font-medium">Sin notas todavía</p>
              <p className="text-xs mt-1">
                Agrega notas internas sobre este expediente. Solo el equipo puede verlas.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pr-2">
            {notes.map((note) => {
              const isOwn = note.author_id === currentUserId;
              const canDelete = isOwn || canDeleteAll;
              const initials =
                note.author?.full_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() ?? "?";

              return (
                <div
                  key={note.id}
                  className={cn(
                    "group flex gap-3 rounded-lg p-3 transition-colors",
                    isOwn ? "bg-primary/5" : "bg-muted/40"
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                    <AvatarImage src={note.author?.avatar_url || ""} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-medium leading-none">
                          {note.author?.full_name ?? "Usuario"}
                          {isOwn && (
                            <span className="ml-1 text-xs text-muted-foreground font-normal">
                              (tú)
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(note.created_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                      </div>
                      {canDelete && (
                        <ConfirmDialog
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                              aria-label="Eliminar nota"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          }
                          title="¿Eliminar nota?"
                          description="Esta acción es permanente. La nota no se puede recuperar."
                          confirmLabel="Eliminar"
                          variant="destructive"
                          onConfirm={() => handleDelete(note.id)}
                        />
                      )}
                    </div>
                    <p className="text-sm mt-1.5 text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                      {note.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* New note form */}
      <form ref={formRef} action={formAction} className="space-y-2">
        <input type="hidden" name="case_id" value={caseId} />
        <div className="flex gap-2 items-end">
          <Textarea
            name="content"
            placeholder="Añade una nota interna... (solo visible para el equipo)"
            className="min-h-[80px] resize-none flex-1 text-sm"
            disabled={isPending}
            required
            maxLength={5000}
            onKeyDown={(e) => {
              // Ctrl/Cmd + Enter submits
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 shrink-0 mb-0.5"
            disabled={isPending}
            aria-label="Enviar nota"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Pulsa <kbd className="px-1 py-0.5 rounded border border-border text-[10px] font-mono">Ctrl</kbd>
          {" + "}
          <kbd className="px-1 py-0.5 rounded border border-border text-[10px] font-mono">Enter</kbd>{" "}
          para enviar rápido
        </p>
        {!state.success && state.validationErrors?.content && (
          <p className="text-sm text-destructive">{state.validationErrors.content[0]}</p>
        )}
      </form>
    </div>
  );
}
