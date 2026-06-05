import { useState } from "react"
import reactLogo from "./assets/react.svg"
import viteLogo from "./assets/vite.svg"
import heroImg from "./assets/hero.png"

function App() {
	const [count, setCount] = useState(0)

	return (
		<>
			<section className="flex grow flex-col place-content-center place-items-center gap-[25px] px-0 py-0 max-lg:gap-[18px] max-lg:px-5 max-lg:pb-6 max-lg:pt-8">
				<div className="relative">
					<img src={heroImg} className="relative z-0 mx-auto w-[170px]" width="170" height="179" alt="" />
					<img
						src={reactLogo}
						className="absolute inset-x-0 top-[34px] z-10 mx-auto h-7 [transform:perspective(2000px)_rotateZ(300deg)_rotateX(44deg)_rotateY(39deg)_scale(1.4)]"
						alt="React logo"
					/>
					<img
						src={viteLogo}
						className="absolute inset-x-0 top-[107px] z-0 mx-auto h-[26px] w-auto [transform:perspective(2000px)_rotateZ(300deg)_rotateX(40deg)_rotateY(39deg)_scale(0.8)]"
						alt="Vite logo"
					/>
				</div>
				<div>
					<h1>Get started</h1>
					<p>
						Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
					</p>
				</div>
				<button
					type="button"
					className="mb-6 inline-flex rounded border-2 border-transparent bg-purple-100 px-2.5 py-[5px] font-mono text-base text-purple-700 transition-colors hover:border-purple-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-purple-400/15 dark:text-purple-300 dark:hover:border-purple-300/50"
					onClick={() => setCount((count) => count + 1)}
				>
					Count is {count}
				</button>
			</section>

			<div className="relative w-full before:absolute before:left-0 before:top-[-4.5px] before:border-[5px] before:border-transparent before:border-l-gray-200 after:absolute after:right-0 after:top-[-4.5px] after:border-[5px] after:border-transparent after:border-r-gray-200 dark:before:border-l-gray-700 dark:after:border-r-gray-700"></div>

			<section className="flex border-t border-gray-200 text-left max-lg:flex-col max-lg:text-center dark:border-gray-700">
				<div className="flex-1 border-r border-gray-200 p-8 max-lg:border-b max-lg:border-r-0 max-lg:p-5 dark:border-gray-700">
					<svg className="mb-4 size-[22px]" role="presentation" aria-hidden="true">
						<use href="/icons.svg#documentation-icon"></use>
					</svg>
					<h2>Documentation</h2>
					<p>Your questions, answered</p>
					<ul className="mt-8 flex list-none gap-2 p-0 max-lg:mt-5 max-lg:flex-wrap max-lg:justify-center">
						<li>
							<a
								className="flex items-center gap-2 rounded-md bg-stone-100/50 px-3 py-1.5 text-base text-gray-950 no-underline transition-shadow hover:shadow-lg max-lg:w-full max-lg:justify-center dark:bg-gray-700/50 dark:text-gray-100"
								href="https://vite.dev/"
								target="_blank"
							>
								<img className="h-[18px]" src={viteLogo} alt="" />
								Explore Vite
							</a>
						</li>
						<li>
							<a
								className="flex items-center gap-2 rounded-md bg-stone-100/50 px-3 py-1.5 text-base text-gray-950 no-underline transition-shadow hover:shadow-lg max-lg:w-full max-lg:justify-center dark:bg-gray-700/50 dark:text-gray-100"
								href="https://react.dev/"
								target="_blank"
							>
								<img className="size-[18px]" src={reactLogo} alt="" />
								Learn more
							</a>
						</li>
					</ul>
				</div>
				<div className="flex-1 p-8 max-lg:p-5">
					<svg className="mb-4 size-[22px]" role="presentation" aria-hidden="true">
						<use href="/icons.svg#social-icon"></use>
					</svg>
					<h2>Connect with us</h2>
					<p>Join the Vite community</p>
					<ul className="mt-8 flex list-none gap-2 p-0 max-lg:mt-5 max-lg:flex-wrap max-lg:justify-center">
						<li className="max-lg:flex-[1_1_calc(50%_-_8px)]">
							<a
								className="flex items-center gap-2 rounded-md bg-stone-100/50 px-3 py-1.5 text-base text-gray-950 no-underline transition-shadow hover:shadow-lg max-lg:w-full max-lg:justify-center dark:bg-gray-700/50 dark:text-gray-100"
								href="https://github.com/vitejs/vite"
								target="_blank"
							>
								<svg className="size-[18px] dark:brightness-200 dark:invert" role="presentation" aria-hidden="true">
									<use href="/icons.svg#github-icon"></use>
								</svg>
								GitHub
							</a>
						</li>
						<li className="max-lg:flex-[1_1_calc(50%_-_8px)]">
							<a
								className="flex items-center gap-2 rounded-md bg-stone-100/50 px-3 py-1.5 text-base text-gray-950 no-underline transition-shadow hover:shadow-lg max-lg:w-full max-lg:justify-center dark:bg-gray-700/50 dark:text-gray-100"
								href="https://chat.vite.dev/"
								target="_blank"
							>
								<svg className="size-[18px] dark:brightness-200 dark:invert" role="presentation" aria-hidden="true">
									<use href="/icons.svg#discord-icon"></use>
								</svg>
								Discord
							</a>
						</li>
						<li className="max-lg:flex-[1_1_calc(50%_-_8px)]">
							<a
								className="flex items-center gap-2 rounded-md bg-stone-100/50 px-3 py-1.5 text-base text-gray-950 no-underline transition-shadow hover:shadow-lg max-lg:w-full max-lg:justify-center dark:bg-gray-700/50 dark:text-gray-100"
								href="https://x.com/vite_js"
								target="_blank"
							>
								<svg className="size-[18px] dark:brightness-200 dark:invert" role="presentation" aria-hidden="true">
									<use href="/icons.svg#x-icon"></use>
								</svg>
								X.com
							</a>
						</li>
						<li className="max-lg:flex-[1_1_calc(50%_-_8px)]">
							<a
								className="flex items-center gap-2 rounded-md bg-stone-100/50 px-3 py-1.5 text-base text-gray-950 no-underline transition-shadow hover:shadow-lg max-lg:w-full max-lg:justify-center dark:bg-gray-700/50 dark:text-gray-100"
								href="https://bsky.app/profile/vite.dev"
								target="_blank"
							>
								<svg className="size-[18px] dark:brightness-200 dark:invert" role="presentation" aria-hidden="true">
									<use href="/icons.svg#bluesky-icon"></use>
								</svg>
								Bluesky
							</a>
						</li>
					</ul>
				</div>
			</section>

			<div className="relative w-full before:absolute before:left-0 before:top-[-4.5px] before:border-[5px] before:border-transparent before:border-l-gray-200 after:absolute after:right-0 after:top-[-4.5px] after:border-[5px] after:border-transparent after:border-r-gray-200 dark:before:border-l-gray-700 dark:after:border-r-gray-700"></div>
			<section className="h-[88px] border-t border-gray-200 max-lg:h-12 dark:border-gray-700"></section>
		</>
	)
}

export default App
