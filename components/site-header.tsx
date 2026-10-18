"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { BellIcon, SunMoonIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader({ title = "Documents" }: { title?: string }) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
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
            nativeButton={false}
            render={<Link href="/dashboard/notifications" />}
            size="icon"
            title="Notifications"
            variant="ghost"
          >
            <BellIcon aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  )
}
