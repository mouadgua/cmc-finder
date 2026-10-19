import type { ReactNode } from "react"

export function AssistantMessage({ content }: { content: string }) {
  const parts = content.split(/(\*\*[\s\S]+?\*\*|\n)/g)
  const lines: ReactNode[] = parts.map((part, index) => {
    if (part === "\n") return <br key={`break-${index}`} />
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong className="font-semibold" key={`bold-${index}`}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })

  return <p className="whitespace-pre-wrap text-sm leading-7">{lines}</p>
}
