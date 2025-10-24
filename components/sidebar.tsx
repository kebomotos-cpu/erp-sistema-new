"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BarChart2,
  Building2,
  Folder,
  Wallet,
  Receipt,
  Settings,
  HelpCircle,
  Menu,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useAuth } from "@/app/providers/auth-provider";

type Role = "dono" | "secretaria" | "vendedor";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[]; // se não definido = visível para todos 
};

const BASE_NAV: NavItem[] = [
  { name: "Dashboard", href: "/", icon: Home , roles: ["dono", "secretaria", "vendedor"]},
  { name: "Cadastro de Cliente", href: "/registro-cliente", icon: BarChart2, roles: ["dono", "secretaria", "vendedor"] },
  { name: "Estoque", href: "/estoque", icon: Building2 , roles: ["dono", "secretaria", "vendedor"]},
  { name: "Contratos /Edição", href: "/contract", icon: Folder, roles: ["dono", "secretaria", "vendedor"] },
  { name: "Despesas Gerais", href: "/despesas", icon: Wallet, roles: ["dono", "secretaria", "vendedor"] },
  { name: "Histórico de Vendas", href: "/historico-de-vendas", icon: Receipt , roles: ["dono", "secretaria", "vendedor"]},
  // exclusivo do dono
  { name: "Lucro por Moto", href: "/motos-lucro", icon: BarChart2, roles: ["dono"] },
  { name: "Dashboard Vendedor", href: "/despesas-dono", icon: BarChart2, roles: ["dono"] },
];

const BOTTOM_NAV: NavItem[] = [
  { name: "Configurações", href: "/settings", icon: Settings },
  { name: "Ajuda", href: "/help", icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user } = useAuth();

  const role: Role = (user?.appRole as Role) ?? "vendedor";

  const navigation = useMemo(
    () => BASE_NAV.filter((i) => !i.roles || i.roles.includes(role)),
    [role]
  );
  const bottomNavigation = useMemo(
    () => BOTTOM_NAV.filter((i) => !i.roles || i.roles.includes(role)),
    [role]
  );

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const NavLink = ({ item }: { item: NavItem }) => (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link
          href={item.href}
          className={cn(
            "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive(item.href)
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
            isCollapsed && "justify-center px-2"
          )}
        >
          <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
          {!isCollapsed && <span>{item.name}</span>}
        </Link>
      </TooltipTrigger>
      {isCollapsed && <TooltipContent side="right">{item.name}</TooltipContent>}
    </Tooltip>
  );

  return (
    <TooltipProvider>
      <>
        {/* Toggle mobile */}
        <button
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-background rounded-md shadow-md"
          onClick={() => setIsMobileOpen((s) => !s)}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div
          className={cn(
            "fixed inset-y-0 z-20 flex flex-col bg-background transition-all duration-300 ease-in-out lg:static",
            isCollapsed ? "w-[72px]" : "w-72",
            isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          {/* Header */}
          <div className="border-b border-border ">
            <div
              className={cn(
                "flex h-16 items-center gap-2 px-4",
                isCollapsed && "justify-center px-2"
              )}
            >
              {!isCollapsed && (
                <Link href="/" className="flex items-center font-semibold">
                  <span className="text-lg">Kebo Motos</span>
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                className={cn("ml-auto h-8 w-8", isCollapsed && "ml-0")}
                onClick={() => setIsCollapsed((s) => !s)}
              >
                <ChevronLeft
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isCollapsed && "rotate-180"
                  )}
                />
                <span className="sr-only">
                  {isCollapsed ? "Expandir" : "Recolher"} barra lateral
                </span>
              </Button>
            </div>
          </div>

          {/* Navegação principal */}
          <div className="flex-1 overflow-auto">
            <nav className="flex-1 space-y-1 px-2 py-4">
              {navigation.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </nav>
          </div>

          {/* Rodapé */}
          <div className="border-t border-border p-2">
            <nav className="space-y-1">
              {bottomNavigation.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </nav>
          </div>
        </div>
      </>
    </TooltipProvider>
  );
}
