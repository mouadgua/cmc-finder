"use client"

import { useDeferredValue, useState } from "react"
import Link from "next/link"
import { MessageSquareTextIcon, SearchIcon, SchoolIcon } from "lucide-react"

import { Input } from "@/components/ui/input"

type Establishment = {
  id: string
  nom: string
  studentCount: number
}

export function EstablishmentsList({
  establishments,
  databaseUnavailable,
}: {
  establishments: Establishment[]
  databaseUnavailable: boolean
}) {
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase())
  const filteredEstablishments = establishments.filter((establishment) =>
    `${establishment.nom} ${establishment.id}`
      .toLocaleLowerCase()
      .includes(deferredQuery),
  )

  return (
    <section className="flex flex-col gap-5" aria-label="Liste des établissements">
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {databaseUnavailable
            ? "Les établissements sont temporairement indisponibles."
            : `${filteredEstablishments.length} établissement${filteredEstablishments.length === 1 ? "" : "s"}`}
        </p>
        <div className="relative w-full sm:max-w-sm">
          <SearchIcon
            aria-hidden="true"
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Rechercher un établissement"
            className="h-10 pl-9"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nom ou identifiant"
            type="search"
            value={query}
          />
        </div>
      </div>

      {databaseUnavailable ? (
        <div className="border-y py-12 text-center">
          <p className="font-medium">Connexion à la base de données impossible</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Réessayez dans quelques instants.
          </p>
        </div>
      ) : filteredEstablishments.length > 0 ? (
        <ul className="divide-y">
          {filteredEstablishments.map((establishment) => (
            <li
              className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
              key={establishment.id}
            >
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  <SchoolIcon aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{establishment.nom}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Référence {establishment.id}
                    <span aria-hidden="true"> · </span>
                    {establishment.studentCount} étudiant
                    {establishment.studentCount === 1 ? "" : "s"} enregistré
                    {establishment.studentCount === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <Link
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted sm:self-auto"
                href={`/dashboard?question=${encodeURIComponent(`Parle-moi de l’établissement ${establishment.nom}.`)}`}
              >
                <MessageSquareTextIcon aria-hidden="true" className="size-4" />
                Questionner l’assistant
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="border-y py-12 text-center">
          <p className="font-medium">
            {establishments.length
              ? "Aucun résultat pour cette recherche"
              : "Aucun établissement n’est encore enregistré"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {establishments.length
              ? "Essayez un autre nom ou identifiant."
              : "La liste apparaîtra ici dès que les données seront ajoutées."}
          </p>
        </div>
      )}
    </section>
  )
}