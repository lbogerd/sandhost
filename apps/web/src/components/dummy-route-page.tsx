type DummyRoutePageProps = {
	title: string
	description: string
}

export function DummyRoutePage({ title, description }: DummyRoutePageProps) {
	return (
		<main className="flex min-w-0 flex-1 flex-col">
			<header className="flex h-16 items-center border-b bg-white px-5">
				<h1 className="text-lg font-semibold tracking-tight">{title}</h1>
			</header>
			<section className="flex flex-1 items-center justify-center p-6">
				<div className="max-w-md text-center">
					<h2 className="text-xl font-semibold text-slate-900">{title}</h2>
					<p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
				</div>
			</section>
		</main>
	)
}
