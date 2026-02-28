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
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl shadow-md">
              AS
            </div>
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
