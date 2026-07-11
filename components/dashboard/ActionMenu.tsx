'use client'

import { useState, useEffect, useRef, type ComponentType } from 'react'
import Link from 'next/link'
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline'
import { ui } from '@/lib/dashboard-ui'

export interface ActionMenuItem {
  label: string
  icon?: ComponentType<{ className?: string }>
  href?: string
  onClick?: () => void
  destructive?: boolean
  hidden?: boolean
}

interface ActionMenuProps {
  items: ActionMenuItem[]
  align?: 'left' | 'right'
  label?: string
}

export default function ActionMenu({ items, align = 'right', label = 'Row actions' }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const visible = items.filter((item) => !item.hidden)

  useEffect(() => {
    if (!open) return
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  if (visible.length === 0) return null

  function close() {
    setOpen(false)
  }

  function itemClass(destructive?: boolean) {
    return `flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
      destructive ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
    }`
  }

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={ui.menuTrigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
      >
        <EllipsisVerticalIcon className="w-5 h-5" />
      </button>
      {open && (
        <div
          role="menu"
          className={`${ui.menuPanel} ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {visible.map((item) => {
            const Icon = item.icon
            const content = (
              <>
                {Icon ? <Icon className="w-4 h-4 shrink-0" /> : null}
                {item.label}
              </>
            )
            if (item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  role="menuitem"
                  className={itemClass(item.destructive)}
                  onClick={() => {
                    item.onClick?.()
                    close()
                  }}
                >
                  {content}
                </Link>
              )
            }
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={itemClass(item.destructive)}
                onClick={() => {
                  item.onClick?.()
                  close()
                }}
              >
                {content}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
