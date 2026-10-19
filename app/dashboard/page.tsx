import { AssistantChat } from "@/components/assistant-chat"
import { DashboardShell } from "@/components/dashboard-shell"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ question?: string; session?: string }>
}) {
  const { question, session } = await searchParams

  return (
    <DashboardShell title="Assistant IA">
      <main className="flex h-[calc(100dvh-var(--header-height)-1rem)] min-h-0 flex-1 flex-col overflow-hidden px-4 md:px-8">
        <AssistantChat
          key={session ?? question ?? "new-chat"}
          initialSessionId={session ?? ""}
          initialQuestion={question ?? ""}
          isConfigured={Boolean(process.env.GROQ_API_KEY)}
        />
      </main>
    </DashboardShell>
  )
}
