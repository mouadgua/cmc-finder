"use client"

import { useState, type FormEvent } from "react"
import { CheckIcon, LoaderCircleIcon, ShieldCheckIcon, UserRoundIcon } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AccountSettings() {
  const { data: session, isPending } = authClient.useSession()
  const [name, setName] = useState<string | null>(null)
  const [profileStatus, setProfileStatus] = useState("")
  const [profileError, setProfileError] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [passwordStatus, setPasswordStatus] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingProfile(true)
    setProfileError("")
    setProfileStatus("")

    try {
      const result = await authClient.updateUser({
        name: (name ?? session?.user.name ?? "").trim(),
      })

      if (result.error) {
        setProfileError(result.error.message ?? "La mise à jour a échoué.")
        return
      }

      setProfileStatus("Votre profil a été mis à jour.")
    } catch {
      setProfileError("Impossible de joindre le serveur. Réessayez.")
    } finally {
      setSavingProfile(false)
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingPassword(true)
    setPasswordError("")
    setPasswordStatus("")

    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      })

      if (result.error) {
        setPasswordError(result.error.message ?? "Le changement de mot de passe a échoué.")
        return
      }

      setCurrentPassword("")
      setNewPassword("")
      setPasswordStatus("Votre mot de passe a été modifié.")
    } catch {
      setPasswordError("Impossible de joindre le serveur. Réessayez.")
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="divide-y border-y">
      <section className="grid gap-6 py-7 md:grid-cols-[220px_1fr]">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <UserRoundIcon aria-hidden="true" className="size-4 text-emerald-700 dark:text-emerald-300" />
            Profil
          </div>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            Les informations utilisées pour votre compte.
          </p>
        </div>
        <form className="flex flex-col gap-4" onSubmit={updateProfile}>
          <div className="grid gap-2">
            <Label htmlFor="account-name">Nom complet</Label>
            <Input
              autoComplete="name"
              id="account-name"
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              required
              value={name ?? session?.user.name ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="account-email">Adresse e-mail</Label>
            <Input
              autoComplete="email"
              id="account-email"
              readOnly
              value={isPending ? "Chargement…" : session?.user.email ?? ""}
            />
            <p className="text-xs text-muted-foreground">
              L’adresse e-mail ne peut pas être modifiée depuis cet écran.
            </p>
          </div>
          {profileError && <p className="text-sm text-destructive" role="alert">{profileError}</p>}
          {profileStatus && (
            <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300" role="status">
              <CheckIcon aria-hidden="true" className="size-4" />
              {profileStatus}
            </p>
          )}
          <div>
            <Button
              disabled={
                savingProfile ||
                isPending ||
                !(name ?? session?.user.name ?? "").trim()
              }
              type="submit"
            >
              {savingProfile && <LoaderCircleIcon aria-hidden="true" className="animate-spin" />}
              Enregistrer le profil
            </Button>
          </div>
        </form>
      </section>

      <section className="grid gap-6 py-7 md:grid-cols-[220px_1fr]">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheckIcon aria-hidden="true" className="size-4 text-emerald-700 dark:text-emerald-300" />
            Sécurité
          </div>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            Choisissez un mot de passe d’au moins 8 caractères.
          </p>
        </div>
        <form className="flex flex-col gap-4" onSubmit={updatePassword}>
          <div className="grid gap-2">
            <Label htmlFor="current-password">Mot de passe actuel</Label>
            <Input
              autoComplete="current-password"
              id="current-password"
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              type="password"
              value={currentPassword}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input
              autoComplete="new-password"
              id="new-password"
              minLength={8}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              type="password"
              value={newPassword}
            />
          </div>
          {passwordError && <p className="text-sm text-destructive" role="alert">{passwordError}</p>}
          {passwordStatus && (
            <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300" role="status">
              <CheckIcon aria-hidden="true" className="size-4" />
              {passwordStatus}
            </p>
          )}
          <div>
            <Button disabled={savingPassword} type="submit" variant="outline">
              {savingPassword && <LoaderCircleIcon aria-hidden="true" className="animate-spin" />}
              Modifier le mot de passe
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}