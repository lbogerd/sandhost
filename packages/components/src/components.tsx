import type { ReactNode } from "react"

export function PageShell({ children }: { children: ReactNode }) {
	return <main className="m-auto">{children}</main>
}
