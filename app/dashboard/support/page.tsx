import { PageTransition } from "@/components/page-transition"
import {
  ArrowUpRightIcon,
  MailIcon,
  MessageCircleIcon,
  SendIcon,
} from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

const frequentlyAskedQuestions = [
  {
    question: "Comment contacter l’équipe support ?",
    answer:
      "Vous pouvez nous écrire par e-mail ou nous envoyer un message sur WhatsApp. Choisissez le canal qui vous convient le mieux.",
  },
  {
    question: "Que faut-il inclure dans ma demande ?",
    answer:
      "Décrivez le problème ou votre question avec le plus de détails possible. Si votre demande concerne votre compte, indiquez l’adresse e-mail associée.",
  },
  {
    question: "Où envoyer une demande via le formulaire ?",
    answer:
      "Le lien du formulaire n’est pas encore disponible. En attendant, vous pouvez nous contacter directement par e-mail ou WhatsApp.",
  },
]

export default function SupportPage() {
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
        <SiteHeader title="Support" />
        <PageTransition>
          <main className="flex flex-1 flex-col gap-8 px-4 py-8 md:px-6">
          <section className="mx-auto flex w-full max-w-5xl flex-col gap-3">
            <p className="text-sm font-medium text-muted-foreground">
              Centre d’aide
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              Comment pouvons-nous vous aider ?
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Consultez les réponses ci-dessous ou contactez-nous directement.
              Nous serons ravis de vous aider.
            </p>
          </section>

          <section
            aria-label="Moyens de contacter le support"
            className="mx-auto grid w-full max-w-5xl gap-4 md:grid-cols-3"
          >
            <Card>
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted">
                  <MailIcon aria-hidden="true" className="size-5" />
                </div>
                <CardTitle>E-mail</CardTitle>
                <CardDescription>
                  Écrivez-nous et nous vous répondrons dès que possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
                  href="mailto:mouadguarraz@gmail.com"
                >
                  mouadguarraz@gmail.com
                  <ArrowUpRightIcon aria-hidden="true" className="size-4" />
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted">
                  <MessageCircleIcon aria-hidden="true" className="size-5" />
                </div>
                <CardTitle>WhatsApp</CardTitle>
                <CardDescription>
                  Envoyez-nous un message directement sur WhatsApp.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
                  href="https://wa.me/212674451180"
                  rel="noreferrer"
                  target="_blank"
                >
                  +212 674 45 11 80
                  <ArrowUpRightIcon aria-hidden="true" className="size-4" />
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted">
                  <SendIcon aria-hidden="true" className="size-5" />
                </div>
                <CardTitle>Formulaire de contact</CardTitle>
                <CardDescription>
                  Le formulaire sera bientôt disponible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button disabled type="button">
                  Ouvrir le formulaire
                  <ArrowUpRightIcon aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          </section>

          <section className="mx-auto w-full max-w-5xl">
            <div className="mb-4">
              <h3 className="text-xl font-semibold tracking-tight">
                Questions fréquentes
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Quelques réponses pour vous orienter rapidement.
              </p>
            </div>
            <div className="divide-y rounded-xl border">
              {frequentlyAskedQuestions.map(({ question, answer }) => (
                <details className="group p-5" key={question}>
                  <summary className="cursor-pointer list-none font-medium marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {question}
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
          </main>
        </PageTransition>
      </SidebarInset>
    </SidebarProvider>
  )
}
