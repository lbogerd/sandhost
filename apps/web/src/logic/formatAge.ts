const ageFormatter = new Intl.RelativeTimeFormat(undefined, {
	numeric: "always",
	style: "narrow",
})

export function formatAge(isoDate: string) {
	const seconds = Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000))

	if (seconds < 60) return ageFormatter.format(-seconds, "second")
	if (seconds < 3600) return ageFormatter.format(-Math.floor(seconds / 60), "minute")
	if (seconds < 86400) return ageFormatter.format(-Math.floor(seconds / 3600), "hour")

	return ageFormatter.format(-Math.floor(seconds / 86400), "day")
}
