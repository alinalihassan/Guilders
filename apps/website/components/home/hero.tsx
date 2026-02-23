"use client";
import { ArrowRight, Terminal } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const HeroSection = () => {
	return (
		<section className="relative w-full overflow-hidden pb-20 pt-32 md:pb-32 md:pt-40">
			{/* Background Gradients */}
			<div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 rounded-[100%] blur-[120px] -z-10 opacity-50 mix-blend-screen"></div>
			<div className="absolute top-1/3 left-1/3 transform -translate-x-1/2 w-[600px] h-[600px] bg-accent/20 rounded-[100%] blur-[120px] -z-10 opacity-30 mix-blend-screen"></div>

			<div className="container relative z-10 mx-auto px-4 md:px-6 flex flex-col items-center">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="text-center space-y-8"
				>
					<Badge
						variant="outline"
						className="text-sm py-2 px-4 bg-secondary/50 backdrop-blur-md border-primary/20 rounded-full"
					>
						<span className="mr-2 text-primary flex items-center">
							<span className="relative flex h-2 w-2 mr-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
								<span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
							</span>
							v1.0 is Live
						</span>
						<span className="text-muted-foreground">
							Open Source Personal Finance
						</span>
					</Badge>

					<div className="max-w-4xl mx-auto text-center">
						<h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground leading-[1.1]">
							Own your wealth.
							<br />
							<span className="text-transparent bg-gradient-to-r from-primary via-emerald-400 to-accent bg-clip-text drop-shadow-sm">
								Decode your finances.
							</span>
						</h1>
					</div>

					<p className="max-w-2xl mx-auto text-xl text-muted-foreground/80 leading-relaxed">
						Track synced accounts, manage manual assets, and get actionable
						insights from your personal AI analyst. Self-hosted or
						cloud-managed—your data stays yours.
					</p>

					<div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
						<Button className="w-full sm:w-auto font-bold group px-8 py-6 text-lg rounded-full shadow-[0_0_30px_rgba(20,184,100,0.2)] hover:shadow-[0_0_40px_rgba(20,184,100,0.4)] transition-all bg-primary text-primary-foreground">
							Get Started for Free
							<ArrowRight className="size-5 ml-2 group-hover:translate-x-1 transition-transform" />
						</Button>

						<Button
							asChild
							variant="outline"
							className="w-full sm:w-auto font-bold px-8 py-6 text-lg rounded-full border-muted-foreground/20 hover:bg-secondary/80 backdrop-blur-sm"
						>
							<Link
								href="https://github.com/alinalihassan/guilders-elysia"
								target="_blank"
								className="flex items-center text-foreground"
							>
								<Terminal className="size-5 mr-2" />
								Deploy via Docker
							</Link>
						</Button>
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 40 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.7, delay: 0.2 }}
					className="relative mt-24 w-full max-w-6xl mx-auto perspective-[2000px]"
				>
					<div className="rounded-2xl border border-secondary/50 bg-background/40 backdrop-blur-2xl shadow-2xl overflow-hidden ring-1 ring-white/5 relative transform-gpu rotate-x-[2deg] hover:rotate-x-0 transition-transform duration-700 ease-out">
						<div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 pointer-events-none"></div>

						{/* Mac-style Window Header */}
						<div className="flex items-center px-4 py-3 border-b border-border/40 bg-background/50 backdrop-blur-md">
							<div className="flex gap-2">
								<div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
								<div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
								<div className="w-3 h-3 rounded-full bg-green-500/80 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
							</div>
							<div className="mx-auto text-xs font-medium text-muted-foreground/60 tracking-wider uppercase">
								Guilders Dashboard
							</div>
						</div>

						<div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
							{/* Left Column: Net Worth & Cash Flow */}
							<div className="md:col-span-8 flex flex-col gap-6">
								{/* Net Worth Card */}
								<div className="bg-secondary/20 rounded-2xl border border-border/50 p-6 relative overflow-hidden group">
									<div className="absolute top-0 right-0 p-6">
										<Badge
											variant="secondary"
											className="bg-primary/10 text-primary border-primary/20"
										>
											+12.5% All Time
										</Badge>
									</div>
									<div className="text-muted-foreground font-medium mb-1 tracking-tight">
										Total Net Worth
									</div>
									<div className="text-5xl font-bold text-foreground tracking-tight">
										$124,592.00
									</div>
									<div className="mt-8 h-40 w-full relative">
										{/* Glow under line */}
										<div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-50 blur-md"></div>
										<svg
											className="w-full h-full text-primary drop-shadow-[0_0_8px_rgba(20,184,100,0.8)]"
											viewBox="0 0 100 100"
											preserveAspectRatio="none"
										>
											<title>Net worth chart</title>
											<path
												d="M0,80 Q10,75 20,60 T40,70 T60,30 T80,40 T100,10"
												fill="none"
												stroke="currentColor"
												strokeWidth="3"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</div>
								</div>

								{/* Cash Flow */}
								<div className="grid grid-cols-2 gap-4">
									<div className="bg-secondary/20 rounded-2xl border border-border/50 p-5">
										<div className="flex items-center gap-3 mb-3">
											<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
												<ArrowRight className="w-4 h-4 text-primary -rotate-45" />
											</div>
											<div className="text-muted-foreground font-medium text-sm">
												Income
											</div>
										</div>
										<div className="text-2xl font-bold text-foreground">
											+$8,450.00
										</div>
									</div>
									<div className="bg-secondary/20 rounded-2xl border border-border/50 p-5">
										<div className="flex items-center gap-3 mb-3">
											<div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
												<ArrowRight className="w-4 h-4 text-destructive rotate-45" />
											</div>
											<div className="text-muted-foreground font-medium text-sm">
												Expenses
											</div>
										</div>
										<div className="text-2xl font-bold text-foreground">
											-$3,120.50
										</div>
									</div>
								</div>
							</div>

							{/* Right Column: Transactions */}
							<div className="md:col-span-4 bg-secondary/20 rounded-2xl border border-border/50 p-6 flex flex-col">
								<div className="font-semibold text-lg mb-4 tracking-tight">
									Recent Activity
								</div>
								<div className="flex flex-col gap-4 flex-1">
									{[
										{
											icon: "🥑",
											name: "Whole Foods",
											amount: "-$142.81",
											date: "Today, 2:45 PM",
											category: "Groceries",
										},
										{
											icon: "🍿",
											name: "Netflix",
											amount: "-$15.49",
											date: "Yesterday",
											category: "Entertainment",
										},
										{
											icon: "💻",
											name: "AWS",
											amount: "-$42.00",
											date: "Yesterday",
											category: "Software",
										},
										{
											icon: "🏠",
											name: "Rent",
											amount: "-$2,100.00",
											date: "May 1",
											category: "Housing",
										},
										{
											icon: "💰",
											name: "Salary",
											amount: "+$4,225.00",
											date: "May 1",
											category: "Income",
											positive: true,
										},
									].map((tx, i) => (
										<div
											key={i}
											className="flex justify-between items-center group cursor-pointer"
										>
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-full bg-background/80 border border-border/50 shadow-sm flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
													{tx.icon}
												</div>
												<div>
													<div className="text-sm font-medium text-foreground">
														{tx.name}
													</div>
													<div className="text-xs text-muted-foreground">
														{tx.category}
													</div>
												</div>
											</div>
											<div
												className={`text-sm font-semibold ${tx.positive ? "text-primary" : "text-foreground"}`}
											>
												{tx.amount}
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>

					<div className="absolute -bottom-32 left-0 w-full h-64 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none"></div>
				</motion.div>
			</div>
		</section>
	);
};
