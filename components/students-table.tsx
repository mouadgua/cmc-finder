"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  SearchIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type StudentRow = {
  id: string
  nom: string
  prenom: string | null
  hasAccess: boolean
  requestPending: boolean
  filiere?: string | null
  groupe?: string | null
  anneeEtude?: string | null
}

type StudentsResponse = {
  rows: StudentRow[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
  filters: { filieres: string[]; groupes: string[]; enabled: boolean }
}

function HiddenValue() {
  return (
    <>
      <span aria-hidden="true" className="select-none blur-[4px]">
        Informations
      </span>
      <span className="sr-only">Informations protégées</span>
    </>
  )
}

export function StudentsTable({ etablissementId }: { etablissementId: string }) {
  const [result, setResult] = useState<StudentsResponse | null>(null)
  const [query, setQuery] = useState("")
  const [filiere, setFiliere] = useState("")
  const [groupe, setGroupe] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ page: String(page) })
    if (query.trim()) params.set("q", query.trim())
    if (filiere) params.set("filiere", filiere)
    if (groupe) params.set("groupe", groupe)

    fetch(
      `/api/etablissements/${encodeURIComponent(etablissementId)}/etudiants?${params}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const data = (await response.json()) as
          | StudentsResponse
          | { error?: string }
        if (!response.ok || !("rows" in data)) {
          throw new Error(
            "error" in data ? data.error : "La liste n’a pas pu être chargée.",
          )
        }
        setResult(data)
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return
        setError(
          cause instanceof Error
            ? cause.message
            : "La liste n’a pas pu être chargée.",
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [etablissementId, page, query, filiere, groupe])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")
    setPage(1)
  }

  function changeFilter(setFilter: (value: string) => void, value: string) {
    setLoading(true)
    setError("")
    setPage(1)
    setFilter(value)
  }

  return (
    <section aria-label="Liste des étudiants" className="flex flex-col gap-5">
      <form
        className="grid grid-cols-1 items-end gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,0.7fr)_minmax(10rem,0.5fr)_auto]"
        onSubmit={submitSearch}
        role="search"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <label className="text-sm font-medium" htmlFor="student-search">
            Rechercher par nom ou prénom
          </label>
          <div className="relative">
            <SearchIcon
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="h-10 pl-9"
              id="student-search"
              onChange={(event) => {
                setLoading(true)
                setError("")
                setQuery(event.target.value)
              }}
              placeholder="Nom ou prénom"
              value={query}
            />
          </div>
        </div>
        {result?.filters.enabled && (
          <>
            <label className="block min-w-0 space-y-2 text-sm font-medium">
              Filière
              <select
                className="block h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 font-normal"
                onChange={(event) =>
                  changeFilter(setFiliere, event.currentTarget.value)
                }
                value={filiere}
              >
                <option value="">Toutes</option>
                {result.filters.filieres.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 space-y-2 text-sm font-medium">
              Groupe
              <select
                className="block h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 font-normal"
                onChange={(event) =>
                  changeFilter(setGroupe, event.currentTarget.value)
                }
                value={groupe}
              >
                <option value="">Tous</option>
                {result.filters.groupes.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
          </>
        )}
        <Button className="h-10" type="submit" variant="outline">Rechercher</Button>
      </form>

      {error ? (
        <div className="rounded-xl border border-destructive/30 p-6 text-sm text-destructive" role="alert">
          {error}
        </div>
      ) : loading && !result ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" />
          Chargement de la liste…
        </div>
      ) : result ? (
        <>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {result.pagination.total} étudiant
            {result.pagination.total === 1 ? "" : "s"} trouvé
            {result.pagination.total === 1 ? "" : "s"}.
            {!result.filters.enabled && (
              <> Les informations détaillées sont réservées aux utilisateurs autorisés.</>
            )}
          </p>
          {result.rows.length ? (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Prénom</th>
                    <th className="px-4 py-3 font-medium">Nom</th>
                    <th className="px-4 py-3 font-medium">Filière</th>
                    <th className="px-4 py-3 font-medium">Groupe</th>
                    <th className="px-4 py-3 font-medium">Année</th>
                    <th className="px-4 py-3 font-medium">Accès</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.rows.map((student) => (
                    <tr className="hover:bg-muted/30" key={student.id}>
                      <td className="px-4 py-3">
                        <Link
                          className="font-medium underline-offset-4 hover:underline"
                          href={`/dashboard/etudiants/${encodeURIComponent(student.id)}`}
                        >
                          {student.prenom || "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium">{student.nom}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {student.hasAccess ? student.filiere || "—" : <HiddenValue />}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {student.hasAccess ? student.groupe || "—" : <HiddenValue />}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {student.hasAccess ? student.anneeEtude || "—" : <HiddenValue />}
                      </td>
                      <td className="px-4 py-3">
                        {student.hasAccess ? (
                          <Link
                            className="inline-flex items-center gap-1 text-emerald-700 hover:underline dark:text-emerald-300"
                            href={`/dashboard/etudiants/${encodeURIComponent(student.id)}`}
                          >
                            Consulter
                          </Link>
                        ) : (
                          <Link
                            className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                            href={`/dashboard/etudiants/${encodeURIComponent(student.id)}`}
                          >
                            <LockKeyholeIcon aria-hidden="true" className="size-4" />
                            {student.requestPending ? "Ticket en attente" : "Déverrouiller"}
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border py-12 text-center">
              <p className="font-medium">Aucun étudiant ne correspond aux critères</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Modifiez le nom ou les filtres puis réessayez.
              </p>
            </div>
          )}

          <nav
            aria-label="Pagination des étudiants"
            className="flex items-center justify-between border-t pt-4"
          >
            <span className="text-sm text-muted-foreground">
              Page {result.pagination.page} sur {result.pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                disabled={page <= 1 || loading}
                onClick={() => {
                  setLoading(true)
                  setPage((current) => Math.max(1, current - 1))
                }}
                variant="outline"
              >
                <ChevronLeftIcon aria-hidden="true" />
                Précédent
              </Button>
              <Button
                disabled={page >= result.pagination.totalPages || loading}
                onClick={() => {
                  setLoading(true)
                  setPage((current) =>
                    Math.min(result.pagination.totalPages, current + 1),
                  )
                }}
                variant="outline"
              >
                Suivant
                <ChevronRightIcon aria-hidden="true" />
              </Button>
            </div>
          </nav>
        </>
      ) : null}

      {result?.rows.some((student) => !student.hasAccess) && (
        <aside className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
          <p className="font-medium">Déverrouiller une fiche étudiant</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ouvrez un prénom pour payer la fiche ou envoyer une demande d’accès par ticket.
          </p>
        </aside>
      )}
    </section>
  )
}
