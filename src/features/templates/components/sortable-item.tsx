import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, X } from 'lucide-react';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  onRemove: (id: string) => void;
}

export function SortableItem({ id, children, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
       <Card className={isDragging ? 'ring-2 ring-primary' : ''}>
         <CardContent className="p-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" className="cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
               <GripVertical className="h-4 w-4 text-muted-foreground" />
            </Button>
            <div className="flex-1">
                {children}
            </div>
            <Button variant="ghost" size="icon" onClick={() => onRemove(id)} className="text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
            </Button>
         </CardContent>
       </Card>
    </div>
  );
}
