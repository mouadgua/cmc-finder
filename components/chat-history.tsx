"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"
import { HistoryIcon } from "lucide-react"

import {
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