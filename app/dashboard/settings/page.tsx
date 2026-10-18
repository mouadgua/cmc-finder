import { AccountSettings } from "@/components/account-settings"
import { DashboardShell } from "@/components/dashboard-shell"

export default function SettingsPage() {
  return (
    <DashboardShell title="Paramètres du compte">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-8 md:px-8">
        <header>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Votre espace personnel
          </p>
          <h2 className="mt-2 text-3xl font-semibold">Paramètres du compte</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Gérez vos informations personnelles et la sécurité de votre compte.
          </p>
        </header>
        <AccountSettings />
      </main>
    </DashboardShell>
  )
}