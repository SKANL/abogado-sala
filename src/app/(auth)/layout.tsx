export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Logo or Brand Header can go here */}
        <div className="flex justify-center mb-8">
            <span className="text-2xl font-bold tracking-tight text-primary">AbogadoSala</span>
        </div>
        {children}
      </div>
    </div>
  );
}
