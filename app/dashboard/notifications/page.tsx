import { PageTransition } from "@/components/page-transition"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { NotificationList } from "./notification-list"

export default function NotificationsPage() {
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
        <SiteHeader title="Notifications" />
        <PageTransition>
          <main className="flex flex-1 flex-col gap-8 px-4 py-8 md:px-6">
            <section className="mx-auto w-full max-w-4xl">
              <p className="text-sm font-medium text-muted-foreground">
                Votre espace
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Notifications
              </h2>
              <p className="mt-2 text-muted-foreground">
                Retrouvez ici les dernières actualités et informations de votre
                compte.
              </p>
            </section>
            <NotificationList />
          </main>
        </PageTransition>
      </SidebarInset>
    </SidebarProvider>
  )
}
