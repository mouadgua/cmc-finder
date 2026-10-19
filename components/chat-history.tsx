"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useSyncExternalStore } from "react"
import { HistoryIcon, Trash2Icon } from "lucide-react"

import {
  deleteChatSession,
  getChatHistorySnapshot,
  readChatHistory,
  subscribeToChatHistory,
} from "@/lib/chat-history"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function ChatHistory() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const snapshot = useSyncExternalStore(
    subscribeToChatHistory,
    getChatHistorySnapshot,
    () => "[]",
  )
  const history = readChatHistory(snapshot)

  return (
    <SidebarGroup className="py-0">
      <SidebarGroupLabel>Historique des conversations</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {history.length > 0 ? (
            history.map((session) => (
              <SidebarMenuItem key={session.id}>
                <SidebarMenuButton
                  className="pr-8"
                  isActive={
                    pathname === "/dashboard" &&
                    searchParams.get("session") === session.id
                  }
                  render={
                    <Link
                      href={`/dashboard?session=${encodeURIComponent(session.id)}`}
                    />
                  }
                  tooltip={session.title}
                >
                  <HistoryIcon aria-hidden="true" />
                  <span>{session.title}</span>
                </SidebarMenuButton>
                <button
                  aria-label={`Supprimer la conversation ${session.title}`}
                  className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-sidebar-foreground/60 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover/menu-item:opacity-100 group-data-[collapsible=icon]:hidden"
                  onClick={() => {
                    const isCurrent =
                      pathname === "/dashboard" &&
                      searchParams.get("session") === session.id
                    deleteChatSession(session.id)
                    if (isCurrent) router.push("/dashboard")
                  }}
                  data-sidebar="menu-action"
                  title="Supprimer cette conversation"
                  type="button"
                >
                  <Trash2Icon aria-hidden="true" className="size-3.5" />
                </button>
              </SidebarMenuItem>
            ))
          ) : (
            <li className="px-2 py-2 text-xs text-muted-foreground">
              Vos conversations apparaîtront ici.
            </li>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}