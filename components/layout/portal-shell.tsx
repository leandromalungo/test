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
import { BrandMark } from '@/components/layout/brand-mark'
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
    { label: 'Clima', href: '/dashboard/climate', iconName: 'CloudRain' },
    { label: 'Indemnizações', href: '/dashboard/claims', iconName: 'AlertTriangle' },
    { label: 'Pagamentos', href: '/dashboard/payments', iconName: 'CreditCard' },
    { label: 'Notificações', href: '/dashboard/notifications', iconName: 'Bell' },
    { label: 'Perfil', href: '/dashboard/profile', iconName: 'User' },
  ],
  manager: [
    { label: 'Resumo', href: '/admin', iconName: 'LayoutDashboard' },
    { label: 'Clientes', href: '/admin/customers', iconName: 'Users' },
    { label: 'Propriedades', href: '/admin/farms', iconName: 'MapPin' },
    { label: 'Produtos', href: '/admin/products', iconName: 'Package' },
    { label: 'Apólices', href: '/admin/policies', iconName: 'FileCheck2' },
    { label: 'Eventos', href: '/admin/events', iconName: 'CloudRain' },
    { label: 'Monitorização', href: '/admin/monitoring', iconName: 'Activity' },
    { label: 'Pagamentos', href: '/admin/payments', iconName: 'CreditCard' },
    { label: 'Fontes', href: '/admin/data-sources', iconName: 'Database' },
    { label: 'Exposição', href: '/admin/exposure', iconName: 'TrendingUp' },
    { label: 'Relatórios', href: '/admin/reports', iconName: 'FileSpreadsheet' },
    { label: 'Auditoria', href: '/admin/audit', iconName: 'History' },
    { label: 'Configurações', href: '/admin/settings', iconName: 'Settings' },
  ],
  operator: [
    { label: 'Painel', href: '/operations', iconName: 'LayoutDashboard' },
    { label: 'Excepções', href: '/operations/exceptions', iconName: 'ShieldAlert' },
    { label: 'Eventos', href: '/operations/events', iconName: 'CloudRain' },
    { label: 'Qualidade', href: '/operations/data-quality', iconName: 'GitCompare' },
    { label: 'Decisões', href: '/operations/approvals', iconName: 'BarChart3' },
    { label: 'Auditoria', href: '/operations/audit', iconName: 'History' },
  ],
}

const ROLE_TITLE: Record<UserRole, string> = {
  farmer: 'Agricultor',
  manager: 'Gestor NOSSA',
  operator: 'Operador',
}

interface PortalShellProps {
  user: UserProfile
  authMode: 'supabase' | 'demonstration'
  children: React.ReactNode
}

/**
 * Moldura unificada para os portais autenticados (Agricultor, Gestor e Operador):
 * barra superior flutuante em cápsula, doca lateral escura em cápsula e área Bento.
 */
export function PortalShell({ user, authMode, children }: PortalShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const navItems = ROLE_NAV[user.role]
  const topPillItems = navItems.slice(0, 5)
  const settingsHref =
    user.role === 'manager'
      ? '/admin/settings'
      : user.role === 'operator'
        ? '/operations/audit'
        : '/dashboard/profile'
  const alertHref =
    user.role === 'manager'
      ? '/admin/events'
      : user.role === 'operator'
        ? '/operations/exceptions'
        : '/dashboard/notifications'

  const isRouteActive = (href: string) =>
    href === '/dashboard' || href === '/admin' || href === '/operations'
      ? pathname === href
      : pathname.startsWith(href)

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

  const initials = user.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="min-h-screen bg-[#E9EEF4] p-2 text-[#0D1526] sm:p-4 lg:p-5">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1440px] flex-col rounded-[28px] border border-white/90 bg-[#F7F9FB] p-3 shadow-sm sm:p-5">
        {/* Barra superior flutuante em cápsula */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Abrir navegação"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#0D1526] lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <BrandMark href="/" tone="dark" />
          </div>

          <nav
            aria-label="Navegação rápida do portal"
            className="hidden items-center gap-1 rounded-full border border-[#ECEFF3] bg-white p-1.5 shadow-2xs lg:flex"
          >
            {topPillItems.map((item) => {
              const active = isRouteActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-[12px] font-medium transition-colors whitespace-nowrap shrink-0',
                    active
                      ? 'bg-[#0D1321] text-white'
                      : 'text-[#6B7280] hover:text-[#0D1526]'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden rounded-full border border-[#ECEFF3] bg-white px-3 py-1.5 text-[11px] font-medium text-[#525252] xl:inline-flex">
              {authMode === 'supabase' ? 'Supabase' : 'Demo'} · {user.province}
            </span>

            <Link
              href={alertHref}
              aria-label="Alertas e notificações"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ECEFF3] bg-white text-[#0D1526] transition-colors hover:bg-[#F4F6F9]"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
            </Link>

            <div className="flex items-center gap-2 rounded-full border border-[#ECEFF3] bg-white py-1 pr-1.5 pl-1.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0D1321] text-[11px] font-semibold text-[#C8F135]">
                {initials || 'NA'}
              </span>
              <div className="hidden pr-1 leading-tight sm:block">
                <p className="max-w-[130px] truncate text-[12px] font-semibold text-[#0D1526]">
                  {user.fullName}
                </p>
                <p className="text-[10px] text-[#6B7280]">{ROLE_TITLE[user.role]}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                aria-label="Terminar sessão"
                title="Terminar sessão"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#F4F6F9] text-[#525252] transition-colors hover:bg-[#FEE2E2] hover:text-[#B91C1C] disabled:opacity-50"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        {/* Corpo com Doca Vertical Escura à esquerda + Conteúdo principal */}
        <div className="mt-5 flex flex-1 gap-4 lg:gap-6">
          <aside
            aria-label="Menu lateral do portal"
            className="hidden w-[60px] shrink-0 flex-col items-center justify-between py-1 lg:flex"
          >
            <nav className="flex flex-col items-center gap-2 rounded-full bg-[#0D1321] p-2 shadow-sm">
              {navItems.map((item) => {
                const Icon =
                  ICON_MAP[item.iconName as keyof typeof ICON_MAP] ||
                  LayoutDashboard
                const active = isRouteActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    aria-label={item.label}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                      active
                        ? 'bg-white text-[#0D1321] shadow-2xs'
                        : 'text-white/65 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )
              })}
            </nav>

            <div className="mt-4 flex flex-col items-center gap-2">
              <Link
                href={settingsHref}
                title="Definições"
                aria-label="Definições"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ECEFF3] bg-white text-[#0D1526] transition-colors hover:bg-[#F4F6F9]"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Terminar sessão"
                aria-label="Terminar sessão"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ECEFF3] bg-white text-[#0D1526] transition-colors hover:bg-[#FEE2E2] hover:text-[#B91C1C] disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </aside>

          {/* Menu gaveta para dispositivos móveis */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <div
                className="fixed inset-0 bg-black/35"
                onClick={() => setMobileOpen(false)}
              />
              <div className="relative z-10 flex w-72 max-w-[85vw] flex-col justify-between bg-white p-4 shadow-xl">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
                    <BrandMark href="/" tone="dark" subtitle={ROLE_TITLE[user.role]} />
                    <button
                      type="button"
                      aria-label="Fechar menu"
                      onClick={() => setMobileOpen(false)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] text-[#0D1526]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <nav aria-label="Menu móvel do portal" className="mt-4 space-y-1">
                    {navItems.map((item) => {
                      const Icon =
                        ICON_MAP[item.iconName as keyof typeof ICON_MAP] ||
                        LayoutDashboard
                      const active = isRouteActive(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            'flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                            active
                              ? 'bg-[#0D1321] text-white'
                              : 'text-[#525252] hover:bg-[#F4F6F9] hover:text-[#0D1526]'
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      )
                    })}
                  </nav>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F7F9FB] px-4 text-sm font-medium text-[#0D1526] disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>{loggingOut ? 'A terminar...' : 'Terminar Sessão'}</span>
                </button>
              </div>
            </div>
          )}

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}
