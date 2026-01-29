export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <span className="text-xl font-bold text-foreground">Portal Cliente</span>
            {/* Add secure logout or info here */}
        </div>
      </header>
      <main className="container mx-auto py-8 px-4">
        {children}
      </main>
    </div>
  );
}
