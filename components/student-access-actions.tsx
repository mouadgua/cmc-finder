"use client"

import { useState } from "react"
import { CreditCardIcon, KeyRoundIcon, LoaderCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export function StudentAccessActions({
  studentId,
  requestPending = false,
}: {
  studentId: string
  requestPending?: boolean
}) {
  const [showRequest, setShowRequest] = useState(false)
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState<"payment" | "request" | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [pending, setPending] = useState(requestPending)

  async function startCheckout() {
    setBusy("payment")
    setError("")
    try {
      const response = await fetch(
        `/api/students/${encodeURIComponent(studentId)}/checkout`,
        { method: "POST" },
      )
      const result = (await response.json()) as { url?: string; error?: string }
      if (!response.ok || !result.url) {
        setError(result.error ?? "Impossible de démarrer le paiement.")
        return
      }
      window.location.assign(result.url)
    } catch {
      setError("Le service de paiement est momentanément indisponible.")
    } finally {
      setBusy(null)
    }
  }

  async function submitRequest() {
    setBusy("request")
    setError("")
    setSuccess("")
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          message:
            message.trim() ||
            "Je souhaite demander l’accès complet à cette fiche étudiant.",
        }),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(result.error ?? "Impossible d’envoyer la demande.")
        return
      }
      setPending(true)
      setShowRequest(false)
      setMessage("")
      setSuccess("Votre demande a été envoyée à l’administrateur sous forme de ticket.")
    } catch {
      setError("La demande n’a pas pu être envoyée. Réessayez.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy !== null} onClick={startCheckout}>
          {busy === "payment" ? (
            <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
          ) : (
            <CreditCardIcon aria-hidden="true" />
          )}
          Payer pour déverrouiller
        </Button>
        <Button
          disabled={pending || busy !== null}
          onClick={() => setShowRequest((current) => !current)}
          variant="outline"
        >
          <KeyRoundIcon aria-hidden="true" />
          {pending ? "Demande en attente" : "Demander l’accès à l’admin"}
        </Button>
      </div>
      {showRequest && (
        <div className="w-full max-w-xl space-y-2 rounded-lg border p-4">
          <label className="text-sm font-medium" htmlFor={`access-message-${studentId}`}>
            Expliquez brièvement pourquoi vous souhaitez accéder à cette fiche
          </label>
          <textarea
            className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            id={`access-message-${studentId}`}
            maxLength={2000}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Votre message à l’administrateur (facultatif)"
            value={message}
          />
          <div className="flex gap-2">
            <Button disabled={busy !== null} onClick={submitRequest}>
              {busy === "request" && (
                <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
              )}
              Envoyer le ticket
            </Button>
            <Button
              disabled={busy !== null}
              onClick={() => setShowRequest(false)}
              variant="ghost"
            >
              Annuler
            </Button>
          </div>
        </div>
      )}
      {pending && !success && (
        <p className="text-sm text-muted-foreground">
          Votre demande est en attente de la réponse de l’administrateur.
        </p>
      )}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {success && <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">{success}</p>}
    </div>
  )
}
