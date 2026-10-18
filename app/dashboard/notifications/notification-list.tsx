"use client"

import * as React from "react"
import {
  BellRingIcon,
  CheckCheckIcon,
  CircleCheckIcon,
  InfoIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type Notification = {
  id: number
  title: string
  description: string
  date: string
  read: boolean
  kind: "info" | "success"
}

const initialNotifications: Notification[] = [
  {
    id: 1,
    title: "Bienvenue sur votre espace",
    description:
      "Votre espace est prêt. Retrouvez vos outils et vos informations depuis le tableau de bord.",
    date: "Aujourd’hui",
    read: false,
    kind: "info",
  },
  {
    id: 2,
    title: "Votre compte est configuré",
    description:
      "La configuration de votre compte est terminée. Vous pouvez commencer à utiliser votre espace.",
    date: "Hier",
    read: false,
    kind: "success",
  },
  {
    id: 3,
    title: "Le support est à votre disposition",
    description:
      "Une question ? Retrouvez votre adresse e-mail et votre contact WhatsApp sur la page Support.",
    date: "Il y a 3 jours",
    read: true,
    kind: "info",
  },
]

export function NotificationList() {
  const [notifications, setNotifications] =
    React.useState(initialNotifications)
  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length

  function markAllAsRead() {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true }))
    )
  }

  function toggleRead(id: number) {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, read: !notification.read }
          : notification
      )
    )
  }

  return (
    <section
      aria-label="Liste des notifications"
      className="mx-auto w-full max-w-4xl"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {unreadCount === 0
            ? "Vous êtes à jour."
            : `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`}
        </p>
        <Button
          disabled={unreadCount === 0}
          onClick={markAllAsRead}
          size="sm"
          variant="outline"
        >
          <CheckCheckIcon aria-hidden="true" />
          Tout marquer comme lu
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        {notifications.map((notification) => (
          <Card
            className={
              notification.read
                ? "bg-card"
                : "border-primary/25 bg-primary/[0.03]"
            }
            key={notification.id}
          >
            <CardContent className="flex items-start gap-4">
              <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                {notification.kind === "success" ? (
                  <CircleCheckIcon
                    aria-hidden="true"
                    className="size-5 text-muted-foreground"
                  />
                ) : notification.read ? (
                  <InfoIcon
                    aria-hidden="true"
                    className="size-5 text-muted-foreground"
                  />
                ) : (
                  <BellRingIcon
                    aria-hidden="true"
                    className="size-5 text-foreground"
                  />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="font-medium">{notification.title}</h3>
                  {!notification.read && (
                    <span
                      aria-label="Non lue"
                      className="size-2 rounded-full bg-primary"
                    />
                  )}
                  <time className="text-xs text-muted-foreground">
                    {notification.date}
                  </time>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {notification.description}
                </p>
              </div>
              <Button
                aria-label={
                  notification.read
                    ? `Marquer « ${notification.title} » comme non lue`
                    : `Marquer « ${notification.title} » comme lue`
                }
                onClick={() => toggleRead(notification.id)}
                size="sm"
                variant="ghost"
              >
                {notification.read ? "Non lue" : "Marquer comme lue"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
