"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Users, User } from "lucide-react";
import type { ClientsViewMode } from "@/lib/db/queries";

interface ClientsViewToggleProps {
  currentView: ClientsViewMode;
  allowAll: boolean;
}

const options: { value: ClientsViewMode; label: string; icon: React.ReactNode }[] = [
  {
    value: "mine",
    label: "Mis Clientes",
    icon: <User className="h-3.5 w-3.5 shrink-0" />,
  },
  {
    value: "all",
    label: "Todos",
    icon: <Users className="h-3.5 w-3.5 shrink-0" />,
  },
];

export function ClientsViewToggle({ currentView, allowAll }: ClientsViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const visibleOptions = allowAll ? options : options.filter((o) => o.value !== "all");

  const handleChange = (value: string) => {
    if (!value) return;
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
