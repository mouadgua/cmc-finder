"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageSquareTextIcon,
  SearchIcon,
  SchoolIcon,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Establishment = {
  id: string
  nom: string
  studentCount: number
}

export function EstablishmentsList({
  establishments,
  databaseUnavailable,
  page,
  pageSize,
  query,
  total,
}: {
  establishments: Establishment[]
  databaseUnavailable: boolean
  page: number
  pageSize: number
  query: string
  total: number
}) {
  const router = useRouter()
  const [search, setSearch] = useState(query)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (search.trim()) params.set("q", search.trim())
    router.push(
      `/dashboard/etablissements${params.size ? `?${params}` : ""}`,
    )
  }

  return (
    <section className="flex flex-col gap-5" aria-label="Liste des établissements">
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {databaseUnavailable
            ? "Les établissements sont temporairement indisponibles."
            : `${total} établissement${total === 1 ? "" : "s"}`}
        </p>
        <form
          className="flex w-full gap-2 sm:max-w-lg"
          onSubmit={submitSearch}
          role="search"
        >
          <div className="relative flex-1">
            <SearchIcon
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Rechercher un établissement"
              className="h-10 pl-9"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom ou identifiant"
              type="search"
              value={search}
            />
          </div>
          <Button type="submit" variant="outline">Rechercher</Button>
        </form>
      </div>

      {databaseUnavailable ? (
        <div className="border-y py-12 text-center">
          <p className="font-medium">Connexion à la base de données impossible</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Réessayez dans quelques instants.
          </p>
        </div>
      ) : establishments.length > 0 ? (
        <>
          <ul className="divide-y">
            {establishments.map((establishment) => (
              <li
                className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
                key={establishment.id}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    <SchoolIcon aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <Link
                      className="truncate font-semibold hover:underline"
                      href={`/dashboard/etablissements/${encodeURIComponent(establishment.id)}`}
                    >
                      {establishment.nom}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Référence {establishment.id}
                      <span aria-hidden="true"> · </span>
                      {establishment.studentCount} étudiant
                      {establishment.studentCount === 1 ? "" : "s"} enregistré
                      {establishment.studentCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    className={buttonVariants({ variant: "outline" })}
                    href={`/dashboard/etablissements/${encodeURIComponent(establishment.id)}`}
                  >
                    Consulter les étudiants
                  </Link>
                  <Link
                    className={buttonVariants({ variant: "ghost" })}
                    href={`/dashboard?question=${encodeURIComponent(`Parle-moi de l’établissement ${establishment.nom}.`)}`}
                  >
                    <MessageSquareTextIcon aria-hidden="true" />
                    Questionner l’assistant
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          <nav
            aria-label="Pagination des établissements"
            className="flex items-center justify-between border-t pt-4"
          >
            <span className="text-sm text-muted-foreground">
              Page {page} sur {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                aria-label="Page précédente"
                disabled={page <= 1}
                onClick={() =>
                  router.push(
                    `/dashboard/etablissements?${new URLSearchParams({
                      ...(query ? { q: query } : {}),
                      page: String(Math.max(1, page - 1)),
                    })}`,
                  )
                }
                variant="outline"
              >
                <ChevronLeftIcon aria-hidden="true" />
                Précédent
              </Button>
              <Button
                aria-label="Page suivante"
                disabled={page >= totalPages}
                onClick={() =>
                  router.push(
                    `/dashboard/etablissements?${new URLSearchParams({
                      ...(query ? { q: query } : {}),
                      page: String(Math.min(totalPages, page + 1)),
                    })}`,
                  )
                }
                variant="outline"
              >
                Suivant
                <ChevronRightIcon aria-hidden="true" />
              </Button>
            </div>
          </nav>
        </>
      ) : (
        <div className="border-y py-12 text-center">
          <p className="font-medium">
            {total ? "Aucun résultat pour cette recherche" : "Aucun établissement n’est encore enregistré"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {total
              ? "Essayez un autre nom ou identifiant."
              : "La liste apparaîtra ici dès que les données seront ajoutées."}
          </p>
        </div>
      )}
    </section>
  )
}
