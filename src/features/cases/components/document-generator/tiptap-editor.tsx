"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Strikethrough, Heading1, Heading2, List, ListOrdered } from "lucide-react";
import { Button } from '@/components/ui/button';

export function TipTapEditor() {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Comienza a redactar tu documento o arrastra campos desde el panel de la izquierda aquí...',
            }),
        ],
        content: ``,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none min-h-[500px]',
            },
            // TipTap intercepta el drop. 
            // handleDrop es una API standard de ProseMirror
            handleDrop: (view, event, slice, moved) => {
                const text = event.dataTransfer?.getData('text/plain');
                if (text) {
                    const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
                    if (coords) {
                        view.dispatch(view.state.tr.insertText(text, coords.pos));
                        return true; // We handled it
                    }
                }
                return false;
            }
        },
    });

    if (!editor) {
        return null;
    }

    return (
        <div className="border rounded-md h-full flex flex-col bg-background shadow-sm overflow-hidden">
            {/* Toolbar simple */}
            <div className="flex items-center gap-1 border-b bg-muted/40 p-2 overflow-x-auto">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleBold().run()} data-active={editor.isActive('bold') ? 'true' : 'false'}>
                    <Bold className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleItalic().run()} data-active={editor.isActive('italic') ? 'true' : 'false'}>
                    <Italic className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                    <Heading1 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                    <Heading2 className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-2" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleBulletList().run()}>
                    <List className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                    <ListOrdered className="h-4 w-4" />
                </Button>
            </div>

            {/* Editor Text Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <EditorContent editor={editor} className="h-full" />
            </div>
            
            <style jsx global>{`
                .tiptap p.is-editor-empty:first-child::before {
                    color: #adb5bd;
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }
            `}</style>
        </div>
    );
}
