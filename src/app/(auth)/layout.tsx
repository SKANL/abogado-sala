import { Logo } from "@/components/common/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
            <Logo variant="icon" size="lg" />
            <div className="text-center">
              <span className="text-2xl font-bold tracking-tight text-foreground">AbogadoSala</span>
              <p className="text-sm text-muted-foreground mt-0.5">Gestión legal profesional</p>
            </div>
        </div>
        {children}
      </div>
    </div>
  );
}
