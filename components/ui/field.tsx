import * as React from 'react'
import { cn } from '@/lib/utils'

export const TextInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#171717] placeholder:text-[#737373] transition-colors focus-visible:border-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/20 disabled:cursor-not-allowed disabled:bg-[#F8F9FA]',
      className
    )}
    {...props}
  />
))
TextInput.displayName = 'TextInput'

export const SelectInput = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#171717] transition-colors focus-visible:border-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/20 disabled:cursor-not-allowed disabled:bg-[#F8F9FA]',
      className
    )}
    {...props}
  >
    {children}
  </select>
))
SelectInput.displayName = 'SelectInput'

export const TextareaInput = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-[88px] w-full rounded-md border border-[#E5E7EB] bg-white p-3 text-sm text-[#171717] placeholder:text-[#737373] transition-colors focus-visible:border-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/20 disabled:cursor-not-allowed disabled:bg-[#F8F9FA]',
      className
    )}
    {...props}
  />
))
TextareaInput.displayName = 'TextareaInput'

export function FormField({
  label,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string
  error?: string
  hint?: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-[#171717]"
      >
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-[#737373]">{hint}</p>
      )}
      {error && (
        <p className="text-xs font-medium text-[#DC2626]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
