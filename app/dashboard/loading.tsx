import { ViewTransition } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Skeleton } from "@/components/ui/skeleton"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function DashboardLoading() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Chargement" />
        <ViewTransition default="none" exit="page-exit">
          <main
            aria-busy="true"
            aria-label="Chargement de la page"
            className="flex flex-1 flex-col gap-8 px-4 py-8 md:px-6"
            role="status"
          >
            <section className="mx-auto flex w-full max-w-5xl flex-col gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-72 max-w-full" />
              <Skeleton className="h-5 w-full max-w-xl" />
            </section>
            <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </section>
            <span className="sr-only">Chargement en cours…</span>
          </main>
        </ViewTransition>
      </SidebarInset>
    </SidebarProvider>
  )
}
