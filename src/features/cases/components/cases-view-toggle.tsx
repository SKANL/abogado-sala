"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Briefcase, BookMarked, Building2 } from "lucide-react";
import type { CasesViewMode } from "@/lib/db/queries";

interface CasesViewToggleProps {
  currentView: CasesViewMode;
  allowAll: boolean;
}

const options: { value: CasesViewMode; label: string; icon: React.ReactNode }[] = [
  {
    value: "assigned",
    label: "Asignados",
    icon: <Briefcase className="h-3.5 w-3.5 shrink-0" />,
  },
  {
    value: "mine",
    label: "Propios",
    icon: <BookMarked className="h-3.5 w-3.5 shrink-0" />,
  },
  {
    value: "all",
    label: "Organización",
    icon: <Building2 className="h-3.5 w-3.5 shrink-0" />,
  },
];

export function CasesViewToggle({ currentView, allowAll }: CasesViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const visibleOptions = allowAll ? options : options.filter((o) => o.value !== "all");

  const handleChange = (value: string) => {
    if (!value) return; // ToggleGroup fires with '' on deselect — keep current
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", value);
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={currentView}
      onValueChange={handleChange}
      className="h-9"
    >
      {visibleOptions.map((opt) => (
        <ToggleGroupItem
          key={opt.value}
          value={opt.value}
          aria-label={opt.label}
          className="gap-1.5 text-xs px-3"
        >
          {opt.icon}
          <span className="hidden sm:inline">{opt.label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
