import { Avatar, AvatarImage, AvatarFallback } from "@wtrn/components/avatar"
import { Button } from "@wtrn/components/button"
import { Input } from "@wtrn/components/input"
import { Search, Monitor, ChevronDown, Bell } from "lucide-react"
import { useIsMac } from "../logic/isMac"
import { useHotkey } from "@tanstack/react-hotkeys"

export const Topbar = () => {
	const isMac = useIsMac()

	useHotkey("Mod+/", () => {
		// focus the search input when the hotkey is pressed
		const input = document.getElementById("search-input") as HTMLInputElement

		if (input) {
			input.focus()
		}
	})

	useHotkey("Escape", () => {
		// unselect whichever element is currently focused when the escape key is pressed
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur()
		}

		// reset tab index to the first element of the page
		const firstElement = document.querySelector(
			"body *:not(script):not(style):not(link):not(meta):not(title):not(head):not(html)",
		) as HTMLElement

		if (firstElement) {
			firstElement.tabIndex = 0
			firstElement.focus()
		}
	})

	return (
		<header className="flex h-16 items-center gap-4 border-b bg-white px-5 dark:bg-card">
			<div className="relative flex-1">
				<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					className="h-10 pl-9 pr-14"
					placeholder="Search machines or sandboxes..."
					id="search-input"
				/>
				<kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
					{isMac ? "⌘ /" : "Ctrl /"}
				</kbd>
			</div>
			<Button variant="outline" className="h-10 min-w-44 justify-between">
				<span className="flex items-center gap-2">
					<Monitor className="size-4" />
					All Machines
				</span>
				<ChevronDown className="size-4" />
			</Button>
			<div className="ml-auto flex items-center gap-4">
				<button
					type="button"
					className="relative rounded-full p-2 text-muted-foreground hover:bg-muted dark:hover:bg-muted/70"
				>
					<Bell className="size-5" />
					<span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
						3
					</span>
				</button>
				<div className="flex items-center gap-3">
					<Avatar className="h-9 w-9">
						<AvatarImage src="/avatars/alex-morgan.png" alt="Alex Morgan" />
						<AvatarFallback>AM</AvatarFallback>
					</Avatar>
					<span className="text-sm font-medium">Alex Morgan</span>
					<ChevronDown className="size-4 text-muted-foreground" />
				</div>
			</div>
		</header>
	)
}
