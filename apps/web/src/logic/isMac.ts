import { useEffect, useState } from "react"

export function isMac() {
	if (typeof navigator === "undefined") return false

	return /Mac|iPhone|iPad|iPod/.test(navigator.platform)
}

export function useIsMac() {
	const [mac, setMac] = useState(false)

	// we useEffect here to avoid hydration mismatch
	// since navigator is not available during SSR
	useEffect(() => {
		setMac(isMac())
	}, [])

	return mac
}
