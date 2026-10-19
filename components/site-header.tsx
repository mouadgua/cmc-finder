"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { BellIcon, SunMoonIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { readJsonResponse } from "@/lib/read-json-response"

export function SiteHeader({ title = "Documents" }: { title?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let active = true
    const refresh = () => {
      fetch("/api/notifications")
        .then(async (response) => {
          const data = await readJsonResponse<{
            unreadCount?: number
            error?: string
          }>(response, "Chargement du compteur de notifications")
          if (!response.ok) {
            throw new Error(data.error ?? "Impossible de charger les notifications.")
          }
          if (active) setUnreadCount(data.unreadCount ?? 0)
        })
        .catch((cause: unknown) => {
          if (active) {
            console.error("Notification count could not be loaded:", cause)
          }
        })
    }
    refresh()
    const interval = window.setInterval(refresh, 30_000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  return (
    <header className="sticky top-0 z-40 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-1">
          <Button
            aria-label="Changer le thème"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            size="icon"
            title="Changer le thème"
            variant="ghost"
          >
            <SunMoonIcon aria-hidden="true" />
          </Button>
          <Button
            aria-label="Voir les notifications"
            className="relative"
            nativeButton={false}
            render={<Link href="/dashboard/notifications" />}
            size="icon"
            title="Notifications"
            variant="ghost"
          >
            <BellIcon aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 text-destructive-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
