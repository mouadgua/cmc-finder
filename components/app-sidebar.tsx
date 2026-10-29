"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { ChatHistory } from "@/components/chat-history"
import { authClient } from "@/lib/auth-client"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  BellIcon,
  CommandIcon,
  KeyRoundIcon,
  MessageSquareTextIcon,
  SchoolIcon,
  Settings2Icon,
  CircleHelpIcon,
  ShieldCheckIcon,
} from "lucide-react"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { data: session } = authClient.useSession()
  const [administratorId, setAdministratorId] = useState("")
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const userId = session?.user.id

  useEffect(() => {
    if (!userId) return

    const controller = new AbortController()
    fetch("/api/admin/access", { signal: controller.signal })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{ isAdmin: boolean }>)
          : Promise.resolve({ isAdmin: false }),
      )
      .then((result) =>
        setAdministratorId(result.isAdmin ? userId : ""),
      )
      .catch(() => {
        if (!controller.signal.aborted) setAdministratorId("")
      })

    return () => controller.abort()
  }, [userId])

  useEffect(() => {
    if (!userId) return

    let active = true
    const refresh = () => {
      fetch("/api/notifications")
        .then((response) => (response.ok ? response.json() : null))
        .then((result: { unreadCount?: number } | null) => {
          if (active) setUnreadNotifications(result?.unreadCount ?? 0)
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
  }, [userId])

  const isAdministrator = Boolean(userId && administratorId === userId)

  const navigation = [
    {
      title: "Assistant IA",
      url: "/dashboard",
      icon: <MessageSquareTextIcon aria-hidden="true" />,
    },
    {
      title: "Établissements",
      url: "/dashboard/etablissements",
      icon: <SchoolIcon aria-hidden="true" />,
    },
    {
      title: "Mes tickets",
      url: "/dashboard/tickets",
      icon: <KeyRoundIcon aria-hidden="true" />,
    },
    ...(isAdministrator
      ? [
          {
            title: "Administration",
            url: "/dashboard/admin",
            icon: <ShieldCheckIcon aria-hidden="true" />,
          },
        ]
      : []),
  ]

  const secondaryNavigation = [
    {
      title: "Paramètres du compte",
      url: "/dashboard/settings",
      icon: <Settings2Icon aria-hidden="true" />,
    },
    {
      title: "Notifications",
      url: "/dashboard/notifications",
      icon: (
        <span className="relative">
          <BellIcon aria-hidden="true" />
          {userId && unreadNotifications > 0 && (
            <span
              aria-label={`${unreadNotifications} notification(s) non lue(s)`}
              className="absolute -right-1 -top-1 size-2 rounded-full bg-destructive"
            />
          )}
        </span>
      ),
    },
    {
      title: "Support",
      url: "/dashboard/support",
      icon: <CircleHelpIcon aria-hidden="true" />,
    },
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/dashboard" />}
            >
              <CommandIcon className="size-5!" />
              <span className="text-base font-semibold">CMC Finder</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Mon espace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    isActive={pathname === item.url}
                    render={<Link href={item.url} />}
                    tooltip={item.title}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <React.Suspense
          fallback={
            <SidebarGroup className="py-0">
              <SidebarGroupLabel>Historique des conversations</SidebarGroupLabel>
            </SidebarGroup>
          }
        >
          <ChatHistory />
        </React.Suspense>
        <NavSecondary items={secondaryNavigation} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: session?.user.name ?? "Mon compte",
            email: session?.user.email ?? "",
            avatar: session?.user.image ?? "",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
