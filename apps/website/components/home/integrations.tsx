"use client";

import { Marquee } from "@devnomic/marquee";
import type { icons } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import "@devnomic/marquee/dist/index.css";

const sponsors = [
	{ icon: "Landmark", name: "Chase" },
	{ icon: "Bitcoin", name: "Coinbase" },
	{ icon: "CircleDollarSign", name: "Fidelity" },
	{ icon: "CreditCard", name: "Amex" },
	{ icon: "PiggyBank", name: "Vanguard" },
	{ icon: "Wallet", name: "Plaid" },
	{ icon: "CandlestickChart", name: "Robinhood" },
	{ icon: "Building2", name: "Wells Fargo" },
];

export const IntegrationsSection = () => {
	return (
		<section
			id="integrations"
			className="w-full py-16 md:py-24 relative overflow-hidden"
		>
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-border to-transparent"></div>

			<div className="container mx-auto px-4 md:px-6 relative z-10">
				<div className="text-center mb-10">
					<h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
						Syncs seamlessly with 10,000+ institutions via Plaid
					</h2>
				</div>

				<div className="max-w-5xl mx-auto opacity-70 hover:opacity-100 transition-opacity duration-500">
					<Marquee
						className="gap-[4rem]"
						fade
						innerClassName="gap-[4rem]"
						pauseOnHover
					>
						{sponsors.map(({ icon, name }, idx) => (
							<div
								key={name}
								className="flex items-center gap-3 text-lg md:text-xl font-medium text-muted-foreground hover:text-foreground transition-colors"
							>
								<div className="p-3 rounded-full bg-secondary/50 border border-border/50">
									<Icon
										name={icon as keyof typeof icons}
										size={24}
										color="hsl(var(--primary))"
										className="text-primary"
									/>
								</div>
								<span>{name}</span>
							</div>
						))}
					</Marquee>
				</div>
			</div>
		</section>
	);
};
