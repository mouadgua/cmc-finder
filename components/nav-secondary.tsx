"use client"

import Link from "next/link"
import * as React from "react"
import { ArrowRightIcon, SearchIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const searchablePages = [
  {
    title: "Tableau de bord",
    description: "Vue d’ensemble et activité",
    url: "/dashboard",
  },
  {
    title: "Établissements",
    description: "Rechercher un établissement CMC",
    url: "/dashboard/etablissements",
  },
  {
    title: "Paramètres du compte",
    description: "Profil, sécurité et mot de passe",
    url: "/dashboard/settings",
  },
  {
    title: "Support",
    description: "Contact, WhatsApp et questions fréquentes",
    url: "/dashboard/support",
  },
  {
    title: "Notifications",
    description: "Actualités et alertes de votre espace",
    url: "/dashboard/notifications",
  },
]

function getPlatform(): "mac" | "windows" | "other" {
  if (typeof navigator === "undefined") {
    return "other"
  }

  const platformName = `${navigator.platform} ${navigator.userAgent}`
  if (/Mac|iPhone|iPad|iPod/i.test(platformName)) {
    return "mac"
  }
  if (/Win/i.test(platformName)) {
    return "windows"
  }
  return "other"
}

function subscribeToPlatform() {
  return () => {}
}

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: React.ReactNode
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const platform = React.useSyncExternalStore(
    subscribeToPlatform,
    getPlatform,
    () => "other"
  )
  const shortcut = platform === "mac" ? "⌘ K" : "Ctrl K"
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase()
  const filteredPages = searchablePages.filter((page) =>
    `${page.title} ${page.description}`
      .toLocaleLowerCase()
      .includes(normalizedQuery)
  )

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLocaleLowerCase() === "k" &&
        !event.altKey
      ) {
        event.preventDefault()
        setSearchOpen(true)
      }

      if (event.key === "Escape" && searchOpen) {
        setSearchOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [searchOpen])

  return (
    <>
      <SidebarGroup {...props}>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                {item.title === "Search" ? (
                  <SidebarMenuButton
                    aria-haspopup="dialog"
                    aria-keyshortcuts={
                      platform === "mac" ? "Meta+K" : "Control+K"
                    }
                    onClick={() => setSearchOpen(true)}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                    <kbd className="ml-auto rounded border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {shortcut}
                    </kbd>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton render={<Link href={item.url} />}>
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[15vh] backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}
        >
          <section
            aria-labelledby="global-search-title"
            aria-modal="true"
            className="w-full max-w-xl overflow-hidden rounded-xl border bg-background shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-center gap-3 border-b px-4">
              <SearchIcon
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground"
              />
              <h2 className="sr-only" id="global-search-title">
                Recherche
              </h2>
              <input
                aria-label="Rechercher dans l’application"
                autoFocus
                className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Rechercher une page..."
                type="search"
                value={searchQuery}
              />
              <kbd className="shrink-0 rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
                Esc
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              <p className="px-3 py-2 text-xs font-medium text-muted-foreground">
                Pages
              </p>
              {filteredPages.length > 0 ? (
                filteredPages.map((page) => (
                  <Link
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    href={page.url}
                    key={page.url}
                    onClick={() => setSearchOpen(false)}
                  >
                    <span>
                      <span className="block font-medium">{page.title}</span>
                      <span className="mt-0.5 block text-muted-foreground">
                        {page.description}
                      </span>
                    </span>
                    <ArrowRightIcon
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                  </Link>
                ))
              ) : (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Aucun résultat pour « {searchQuery} ».
                </p>
              )}
            </div>

            <footer className="border-t px-4 py-3 text-xs text-muted-foreground">
              Ouvrir la recherche avec{" "}
              <kbd className="rounded border px-1.5 py-0.5 font-medium">
                {shortcut}
              </kbd>
            </footer>
          </section>
        </div>
      )}
    </>
  )
}
