'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Calculator,
  CloudRain,
  CreditCard,
  Database,
  FileCheck2,
  FileSpreadsheet,
  GitCompare,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Settings,
  ShieldAlert,
  TrendingUp,
  User,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserProfile, UserRole } from '@/types/domain'

interface NavItem {
  label: string
  href: string
  iconName: string
}

const ICON_MAP = {
  LayoutDashboard,
  MapPin,
  Calculator,
  FileCheck2,
  CloudRain,
  AlertTriangle,
  CreditCard,
  Bell,
  User,
  Users,
  Package,
  Activity,
  Database,
  TrendingUp,
  FileSpreadsheet,
  History,
  Settings,
  ShieldAlert,
  GitCompare,
  BarChart3,
} as const

const ROLE_NAV: Record<UserRole, NavItem[]> = {
  farmer: [
    { label: 'Visão Geral', href: '/dashboard', iconName: 'LayoutDashboard' },
    { label: 'Propriedades', href: '/dashboard/farms', iconName: 'MapPin' },
    { label: 'Simulador', href: '/dashboard/simulate', iconName: 'Calculator' },
    { label: 'Apólices', href: '/dashboard/policies', iconName: 'FileCheck2' },
    { label: 'Monitorização Climática', href: '/dashboard/climate', iconName: 'CloudRain' },
    { label: 'Indemnizações', href: '/dashboard/claims', iconName: 'AlertTriangle' },
    { label: 'Pagamentos', href: '/dashboard/payments', iconName: 'CreditCard' },
    { label: 'Notificações', href: '/dashboard/notifications', iconName: 'Bell' },
    { label: 'Perfil', href: '/dashboard/profile', iconName: 'User' },
  ],
  manager: [
    { label: 'Resumo Executivo', href: '/admin', iconName: 'LayoutDashboard' },
    { label: 'Clientes', href: '/admin/customers', iconName: 'Users' },
    { label: 'Propriedades', href: '/admin/farms', iconName: 'MapPin' },
    { label: 'Produtos', href: '/admin/products', iconName: 'Package' },
    { label: 'Apólices', href: '/admin/policies', iconName: 'FileCheck2' },
    { label: 'Eventos Climáticos', href: '/admin/events', iconName: 'CloudRain' },
    { label: 'Motor de Monitorização', href: '/admin/monitoring', iconName: 'Activity' },
    { label: 'Pagamentos', href: '/admin/payments', iconName: 'CreditCard' },
    { label: 'Fontes Climáticas', href: '/admin/data-sources', iconName: 'Database' },
    { label: 'Exposição & Risco Base', href: '/admin/exposure', iconName: 'TrendingUp' },
    { label: 'Relatórios', href: '/admin/reports', iconName: 'FileSpreadsheet' },
    { label: 'Auditoria', href: '/admin/audit', iconName: 'History' },
    { label: 'Configurações', href: '/admin/settings', iconName: 'Settings' },
  ],
  operator: [
    { label: 'Painel Operacional', href: '/operations', iconName: 'LayoutDashboard' },
    { label: 'Excepções Pendentes', href: '/operations/exceptions', iconName: 'ShieldAlert' },
    { label: 'Investigação de Eventos', href: '/operations/events', iconName: 'CloudRain' },
    { label: 'Qualidade de Dados', href: '/operations/data-quality', iconName: 'GitCompare' },
    { label: 'Decisões Manuais', href: '/operations/approvals', iconName: 'BarChart3' },
    { label: 'Histórico & Auditoria', href: '/operations/audit', iconName: 'History' },
  ],
}

const ROLE_TITLE: Record<UserRole, string> = {
  farmer: 'Portal do Agricultor',
  manager: 'Gestão · NOSSA Seguros',
  operator: 'Operações & Qualidade',
}

interface PortalShellProps {
  user: UserProfile
  authMode: 'supabase' | 'demonstration'
  children: React.ReactNode
}

/**
 * Estrutura de navegação lateral e cabeçalho para os portais autenticados
 * (Agricultor, Gestor NOSSA Seguros e Operador).
 */
export function PortalShell({ user, authMode, children }: PortalShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const navItems = ROLE_NAV[user.role]

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    const targetLogin =
      user.role === 'manager'
        ? '/admin/login'
        : user.role === 'operator'
          ? '/operations/login'
          : '/login'
    router.push(targetLogin)
    router.refresh()
  }

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#F8F9FA] px-3 py-5">
      <div>
        <div className="px-3 pb-5">
          <Link
            href="/"
            className="block text-sm font-bold tracking-tight text-[#171717]"
          >
            NOSSA AgroParamétrico
          </Link>
          <p className="mt-1 text-xs text-[#737373]">{ROLE_TITLE[user.role]}</p>
        </div>

        <nav aria-label="Menu do portal" className="space-y-0.5">
          {navItems.map((item) => {
            const Icon =
              ICON_MAP[item.iconName as keyof typeof ICON_MAP] || LayoutDashboard
            const active =
              item.href === '/dashboard' ||
              item.href === '/admin' ||
              item.href === '/operations'
                ? pathname === item.href
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex h-10 items-center gap-2.5 rounded-md px-3 text-sm font-medium transition-colors whitespace-nowrap',
                  active
                    ? 'bg-white text-[#2563EB] shadow-xs border border-[#E5E7EB]'
                    : 'text-[#525252] hover:bg-white/70 hover:text-[#171717]'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="border-t border-[#E5E7EB] pt-4 px-2">
        <div className="mb-3">
          <p className="truncate text-sm font-medium text-[#171717]">
            {user.fullName}
          </p>
          <p className="truncate text-xs text-[#737373]">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex h-10 w-full items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm font-medium text-[#171717] transition-colors hover:bg-[#F8F9FA] disabled:opacity-50"
        >
          <LogOut className="h-4 w-4 shrink-0 text-[#737373]" aria-hidden="true" />
          <span>{loggingOut ? 'A terminar...' : 'Terminar Sessão'}</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white text-[#171717] lg:flex">
      {/* Barra lateral fixa para desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-[#E5E7EB] lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          {sidebarContent}
        </div>
      </aside>

      {/* Menu gaveta para dispositivos móveis */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[85vw] border-r border-[#E5E7EB] bg-[#F8F9FA]">
            <div className="flex items-center justify-end p-2">
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-md text-[#171717] hover:bg-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Área principal de trabalho */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-[#E5E7EB] bg-white px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Abrir navegação"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-[#E5E7EB] text-[#171717] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-[#737373]">
              {ROLE_TITLE[user.role]} · {user.province}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#737373]">
            <span>
              {authMode === 'supabase'
                ? 'Base de Dados: Supabase PostgreSQL'
                : 'Modo Demonstração Activo (Dados Fictícios)'}
            </span>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
