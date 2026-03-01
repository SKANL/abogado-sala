import { cn } from "@/lib/utils";
import Link from "next/link";

interface LogoProps {
  /** "icon" = monogram only, "full" = icon + text, "text" = text only */
  variant?: "icon" | "full" | "text";
  /** Optional size override */
  size?: "sm" | "default" | "lg";
  /** Wrap in a Link to this href */
  href?: string;
  className?: string;
}

const sizeMap = {
  sm: { box: "h-8 w-8 text-sm", text: "text-lg", subtitle: "text-[11px]" },
  default: { box: "h-10 w-10 text-base", text: "text-xl", subtitle: "text-xs" },
  lg: { box: "h-12 w-12 text-xl", text: "text-2xl", subtitle: "text-sm" },
};

export function Logo({ variant = "full", size = "default", href, className }: LogoProps) {
  const s = sizeMap[size];

  const content = (
    <span className={cn("flex items-center gap-2.5", className)}>
      {variant !== "text" && (
        <span
          className={cn(
            "flex items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-sm shrink-0",
            s.box
          )}
          aria-hidden="true"
        >
          AS
        </span>
      )}
      {variant !== "icon" && (
        <span className="flex flex-col">
          <span className={cn("font-bold tracking-tight text-foreground leading-tight", s.text)}>
            AbogadoSala
          </span>
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex focus-visible:outline-ring/50 rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}
