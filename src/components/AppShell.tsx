import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  BookOpen, Feather, Users, Share2, Clock, Zap, Moon, Sun, Languages, Menu, X, ChevronDown, Plus, PenLine,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { LANGS, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewStoryDialog } from "./NewStoryDialog";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", key: "navDashboard", icon: Feather },
  { to: "/library", key: "navLibrary", icon: BookOpen },
  { to: "/characters", key: "navCharacters", icon: Users },
  { to: "/canvas", key: "navCanvas", icon: Share2 },
  { to: "/timeline", key: "navTimeline", icon: Clock },
  { to: "/capture", key: "navCapture", icon: Zap },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { t, theme, toggleTheme, lang, setLang, stories, activeStory, setActiveStoryId, setNewStoryOpen } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="space-y-3 border-b border-sidebar-border p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t.selectStory}</p>
        <Select value={activeStory?.id ?? ""} onValueChange={setActiveStoryId}>
          <SelectTrigger className="h-auto w-full border-sidebar-border bg-card py-2 text-left shadow-none">
            <SelectValue placeholder={t.noStory} />
          </SelectTrigger>
          <SelectContent>
            {stories.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="font-medium">{s.title}</span>
                <span className="ml-2 text-xs text-muted-foreground">{s.genre}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="w-full shadow-glow" onClick={() => setNewStoryOpen(true)}>
          <Plus /> {t.newStory.replace(/^\+\s*/, "")}
        </Button>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(({ to, key, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <span className={cn("h-5 w-0.5 rounded-full transition-colors", active ? "bg-thread" : "bg-transparent group-hover:bg-thread/40")} />
              <Icon className="size-4" />
              {t[key]}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4 text-xs text-muted-foreground">
        {activeStory && (
          <p>
            {t.writingIn}: <span className="text-foreground">{activeStory.language}</span>
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-6">
        <button className="rounded-md p-2 hover:bg-accent md:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <Link to="/" className="flex items-center gap-2.5">
          <span className="relative flex size-8 items-center justify-center rounded-full bg-thread/15 ring-1 ring-thread/40">
            <PenLine className="size-4 text-thread" />
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-thread" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">{t.appName}</span>
        </Link>
        <span className="hidden text-xs text-muted-foreground lg:inline">— {t.tagline}</span>

        <div className="ml-auto flex items-center gap-1.5 md:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Languages className="size-4" />
                <span className="hidden sm:inline">{LANGS.find((l) => l.code === lang)?.label}</span>
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t.language}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LANGS.map((l) => (
                <DropdownMenuItem key={l.code} onClick={() => setLang(l.code as Lang)} className={cn(lang === l.code && "bg-accent")}>
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t.toggleTheme} className="text-muted-foreground">
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 hover:bg-accent">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground">A</span>
                <span className="hidden text-sm font-medium sm:inline">Aruna</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-display text-base">Aruna Wijaya</p>
                <p className="text-xs font-normal text-muted-foreground">{t.writer} · 3 {t.chapters.toLowerCase()} / minggu</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>{t.profile}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 border-r md:block">
          <div className="sticky top-16 h-[calc(100vh-4rem)]">{sidebar}</div>
        </aside>
        {mobileOpen && (
          <div className="fixed inset-0 top-16 z-30 md:hidden">
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 border-r shadow-soft">{sidebar}</aside>
          </div>
        )}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <NewStoryDialog />
    </div>
  );
}
