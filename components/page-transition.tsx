import { ViewTransition } from "react"

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      default="none"
      enter="page-enter"
      exit="page-exit"
    >
      {children}
    </ViewTransition>
  )
}
