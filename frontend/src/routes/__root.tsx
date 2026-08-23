import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import animationsCss from "../styles/animations.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { YearProvider } from "@/lib/year-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { YearExposureBar } from "@/components/year-exposure-bar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { BootSequence } from "@/components/fx/boot-sequence";
import { PageTransition } from "@/components/fx/page-transition";
import { CommandPalette } from "@/components/fx/command-palette";
import { SpotlightTracker } from "@/components/fx/spotlight";
import { Magnetic } from "@/components/fx/magnetic";
import { ShortcutsOverlay } from "@/components/fx/shortcuts-overlay";
import { RouteShortcuts } from "@/components/fx/route-shortcuts";

import { ClickRipple } from "@/components/fx/click-ripple";
import { CardTilt } from "@/components/fx/card-tilt";
import { RouteCinematic } from "@/components/fx/route-cinematic";
import { StatusTicker } from "@/components/fx/status-ticker";
import { GlobalAnim } from "@/components/fx/global-anim";
import { Confetti } from "@/components/fx/confetti";
import { AmbientParticles } from "@/components/fx/ambient-particles";
import { ScrollProgress } from "@/components/fx/scroll-progress";
import { AuroraBg } from "@/components/fx/aurora-bg";
import { CursorHalo } from "@/components/fx/cursor-halo";
import { BlobCursor } from "@/components/fx/blob-cursor";
import { AudioFx } from "@/components/fx/audio-fx";
import { Command as CommandIcon, Keyboard } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Signal lost</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          That page is not preserved in the archive.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-none bg-primary px-4 py-2 text-sm font-display uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Return to Overview
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl uppercase tracking-wider text-destructive">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "Something went wrong on our end."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-none bg-primary px-4 py-2 text-sm font-display uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-none border border-border bg-background px-4 py-2 text-sm font-display uppercase tracking-wider text-foreground transition-colors hover:bg-accent/10"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DeadMind — We don't preserve documents. We preserve people." },
      {
        name: "description",
        content:
          "DeadMind preserves the institutional knowledge of retiring industrial engineers — copilots, vulnerability schematics, decay simulators, and compliance audits.",
      },
      { name: "author", content: "DeadMind" },
      { property: "og:title", content: "DeadMind — Preserve the engineers, not just the docs" },
      {
        property: "og:description",
        content:
          "Cognitive fingerprinting, knowledge decay simulation, and expert persona copilots for industrial operations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: animationsCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  const location = useLocation();
  const isOffice = location.pathname === "/office";

  if (isOffice) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <div className="fixed inset-0 z-50 w-screen h-screen overflow-hidden bg-[#1e1c22]">
            <Outlet />
          </div>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <YearProvider>
          <SidebarProvider>
            <BootSequence />
            <SpotlightTracker />
            
            <ClickRipple />
            {/* CardTilt removed — no card hover highlight */}
            <CommandPalette />
            <ShortcutsOverlay />
            <RouteShortcuts />
            <RouteCinematic />
            <GlobalAnim />
            <Confetti />
            <AuroraBg />
            <AmbientParticles />
            <ScrollProgress />
            {/* CursorHalo and BlobCursor removed — no ring around pointer */}
            <AudioFx />
            <div className="relative z-10 min-h-screen flex w-full bg-background/70">
              <AppSidebar />

              <div className="flex-1 flex flex-col min-w-0">
                <header
                  className={
                    "sticky top-0 z-40 h-12 flex items-center gap-2 px-2 transition-all duration-300 " +
                    (scrolled
                      ? "border-b border-border bg-background/70 backdrop-blur-xl shadow-[0_8px_24px_-16px_rgba(0,0,0,0.45)]"
                      : "border-b border-transparent bg-transparent")
                  }
                >
                  <SidebarTrigger />
                  <span className="font-display uppercase tracking-[0.25em] text-xs text-muted-foreground truncate">
                    DeadMind / Cognitive Preservation Console
                  </span>
                  <div className="ml-auto flex items-center gap-2 pr-2">
                    <Magnetic strength={0.2}>
                      <button
                        type="button"
                        onClick={() => {
                          const e = new KeyboardEvent("keydown", {
                            key: "k",
                            metaKey: true,
                            ctrlKey: true,
                            bubbles: true,
                          });
                          window.dispatchEvent(e);
                        }}
                        className="hidden sm:inline-flex items-center gap-2 h-8 px-3 border border-border rounded-md bg-card hover:bg-accent/10 hover:scale-105 transition-all cursor-pointer"
                        aria-label="Open command palette"
                      >
                        <CommandIcon className="h-3.5 w-3.5 text-primary" />
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {isMac ? "⌘" : "Ctrl"} K
                        </span>
                      </button>
                    </Magnetic>
                    <Magnetic strength={0.2}>
                      <button
                        type="button"
                        onClick={() => {
                          const e = new KeyboardEvent("keydown", { key: "?", bubbles: true });
                          window.dispatchEvent(e);
                        }}
                        className="hidden sm:inline-flex items-center justify-center h-8 w-8 border border-border rounded-md bg-card hover:bg-accent/10 hover:scale-105 transition-all cursor-pointer"
                        aria-label="Show keyboard shortcuts"
                        title="Keyboard shortcuts (?)"
                      >
                        <Keyboard className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </Magnetic>
                    <Magnetic strength={0.2}>
                      <ThemeToggle />
                    </Magnetic>
                  </div>
                </header>
                <YearExposureBar />
                <StatusTicker />
                <main className="flex-1 min-w-0 overflow-x-hidden">
                  <PageTransition>
                    <Outlet />
                  </PageTransition>
                </main>
              </div>
            </div>
            <Toaster />
          </SidebarProvider>
        </YearProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
