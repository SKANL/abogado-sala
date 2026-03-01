import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Users } from "lucide-react";
import { Logo } from "@/components/common/logo";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-50">
        <Logo variant="full" size="sm" href="/" />
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4 flex items-center" href="/login">
            Iniciar Sesión
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4 flex items-center" href="/registro">
            Registrarse
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 grid place-items-center">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Gestión Legal Simplificada
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  La plataforma integral para despachos de abogados. Gestiona clientes, expedientes y comparte avances en tiempo real.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Link href="/registro">
                    <Button size="lg" className="h-11 px-8 gap-2">
                    Comenzar Gratis <ArrowRight className="h-4 w-4" />
                    </Button>
                </Link>
                <Link href="/login">
                    <Button size="lg" variant="outline" className="h-11 px-8">
                    Ya tengo cuenta
                    </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted grid place-items-center">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-background rounded-full shadow-sm">
                    <Users className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Gestión de Clientes</h2>
                <p className="text-muted-foreground">
                  Centraliza la información de tus clientes y mantén un historial detallado de cada interacción.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-background rounded-full shadow-sm">
                    <Shield className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Seguridad Total</h2>
                <p className="text-muted-foreground">
                  Tus datos y los de tus clientes están protegidos con estándares de seguridad de nivel bancario.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-background rounded-full shadow-sm">
                    <Logo variant="icon" size="sm" />
                </div>
                <h2 className="text-xl font-bold">Portal del Cliente</h2>
                <p className="text-muted-foreground">
                  Permite a tus clientes ver el avance de sus casos y subir documentos de forma segura.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">© 2026 AbogadoSala. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
