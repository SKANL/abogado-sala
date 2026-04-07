"use client";

import { useCaseWizard } from "../../store/use-case-wizard";
import { SidePanelData } from "./side-panel-data";
import { TipTapEditor } from "./tiptap-editor";

export function DocumentEditor() {
    const state = useCaseWizard();

    return (
        <div className="flex h-full min-h-[70vh]">
            {/* Panel Izquierdo: Datos Drag and Drop */}
            <div className="w-[30%] border-r bg-muted/20 overflow-y-auto">
                <SidePanelData data={state} />
            </div>

            {/* Panel Derecho: Editor TipTap */}
            <div className="w-[70%] p-6 overflow-y-auto bg-white dark:bg-zinc-950">
                <TipTapEditor />
            </div>
        </div>
    );
}
