import { ReactNode, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GaugeCircle, Menu, Search, FileText, LogIn, X, Moon, Sun } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTheme } from "@/contexts/ThemeContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface MainLayoutProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Bảng điều khiển",
    href: "/tong-quan",
    icon: <GaugeCircle className="h-4 w-4" aria-hidden="true" />,
  },
  {
    label: "Tra cứu",
    href: "/hs-code-lookup",
    icon: <Search className="h-4 w-4" aria-hidden="true" />,
  },
  {
    label: "Công văn mới",
    href: "/",
    icon: <FileText className="h-4 w-4" aria-hidden="true" />,
  },
];

function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  try {
    const url = new URL(pathname, "http://dummy");
    return url.pathname === "/" ? "/" : url.pathname.replace(/\/$/, "");
  } catch {
    return pathname;
  }
}

export default function MainLayout({ title, description, actions, children }: MainLayoutProps) {
  const [location, setLocation] = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { theme, toggleTheme, switchable } = useTheme();

  const currentPath = useMemo(() => normalizePath(location), [location]);

  const renderNavItems = (onNavigate?: () => void) => (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const isActive = currentPath === normalizePath(item.href);
        return (
          <Button
            key={item.href}
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-3 text-sm",
              isActive ? "bg-blue-600/10 text-blue-700" : "text-slate-600 hover:text-slate-900"
            )}
            onClick={() => {
              setLocation(item.href);
              if (onNavigate) onNavigate();
            }}
            aria-current={isActive ? "page" : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </Button>
        );
      })}
    </nav>
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <div className="flex min-h-screen">
          <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white/70 px-4 py-6 lg:flex">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Cổng dữ liệu hải quan
                </p>
                <p className="text-sm font-bold text-slate-900">Phân tích & OCR</p>
              </div>
            </div>
            <Separator className="my-6" />
            {renderNavItems()}
          </aside>

          <div className="flex flex-1 flex-col">
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
              <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
                <div className="flex items-center gap-3 lg:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileNavOpen(true)}
                    aria-label="Mở danh mục điều hướng"
                  >
                    <Menu className="h-5 w-5" aria-hidden="true" />
                  </Button>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Cổng dữ liệu hải quan
                    </p>
                    <p className="text-sm font-bold text-slate-900">Phân tích & OCR</p>
                  </div>
                </div>
                <div className="hidden lg:flex" />
                <div className="flex items-center gap-2">
                  {switchable && toggleTheme && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleTheme}
                          aria-label="Chuyển chế độ sáng/tối"
                        >
                          {theme === "light" ? (
                            <Moon className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Sun className="h-4 w-4" aria-hidden="true" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Chuyển giao diện</TooltipContent>
                    </Tooltip>
                  )}
                  <Button variant="outline" className="gap-2" onClick={() => setLocation("/dashboard")}>
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                    Đăng nhập
                  </Button>
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10">
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <h1 className="text-2xl font-semibold leading-tight text-slate-900 md:text-3xl">{title}</h1>
                    {description ? (
                      <p className="max-w-2xl text-sm text-slate-600">{description}</p>
                    ) : null}
                  </div>
                  {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
                </div>

                {children}
              </div>
            </main>
          </div>
        </div>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="px-6 pb-4 pt-6 text-left">
              <SheetTitle className="text-sm font-bold uppercase tracking-wide text-blue-600">
                Điều hướng nhanh
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-4 px-6 pb-6">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Đóng danh mục"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
              {renderNavItems(() => setMobileNavOpen(false))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}

