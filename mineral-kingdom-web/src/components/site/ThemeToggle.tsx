"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const THEME_MENU_OPEN_EVENT = "mk:theme-menu-open"
const MOBILE_MENU_OPEN_EVENT = "mk:mobile-menu-open"

export function ThemeToggle() {
  const { setTheme } = useTheme()
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    function handleMobileMenuOpen() {
      setOpen(false)
    }

    window.addEventListener(MOBILE_MENU_OPEN_EVENT, handleMobileMenuOpen)

    return () => {
      window.removeEventListener(MOBILE_MENU_OPEN_EVENT, handleMobileMenuOpen)
    }
  }, [])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (nextOpen) {
      window.dispatchEvent(new Event(THEME_MENU_OPEN_EVENT))
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Toggle theme"
          className="h-10 w-10 rounded-2xl border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] text-[color:var(--mk-ink)] shadow-sm transition hover:scale-[1.02] hover:bg-[color:var(--mk-panel-muted)]"
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="z-[100] rounded-2xl border border-[color:var(--mk-border)] bg-[#fffaf2] text-[color:var(--mk-ink)] shadow-[var(--mk-shadow-soft)] dark:bg-[#050712]"
      >
        <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}