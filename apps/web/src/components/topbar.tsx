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
		// blur the search input when escape is pressed
		const input = document.getElementById("search-input") as HTMLInputElement

		if (input === document.activeElement) {
			input.blur()
		}
	})

	return (
		<header className="flex h-16 items-center gap-4 border-b bg-white px-5">
			<div className="relative flex-1">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
				<Input
					className="h-10 pl-9 pr-14"
					placeholder="Search machines or sandboxes..."
					id="search-input"
				/>
				<kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
					{isMac ? "⌘ /" : "Ctrl /"}
				</kbd>
			</div>
			<Button variant="outline" className="h-10 min-w-44 justify-between">
				<span className="flex items-center gap-2">
					<Monitor className="h-4 w-4" />
					All Machines
				</span>
				<ChevronDown className="h-4 w-4" />
			</Button>
			<div className="ml-auto flex items-center gap-4">
				<button
					type="button"
					className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
				>
					<Bell className="h-5 w-5" />
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
					<ChevronDown className="h-4 w-4 text-slate-500" />
				</div>
			</div>
		</header>
	)
}
