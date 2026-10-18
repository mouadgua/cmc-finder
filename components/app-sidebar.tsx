"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

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
  MessageSquareTextIcon,
  SchoolIcon,
  Settings2Icon,
  CircleHelpIcon,
} from "lucide-react"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { data: session } = authClient.useSession()

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
      icon: <BellIcon aria-hidden="true" />,
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
        <ChatHistory />
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
