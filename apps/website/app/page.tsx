import { FooterSection } from "@/components/home/footer";
import { HeroSection } from "@/components/home/hero";
import { IntegrationsSection } from "@/components/home/integrations";
import { FeaturesBento } from "@/components/home/features";

export const metadata = {
  title: "Guilders - Open Source Personal Finance",
  description: "Track synced assets, manage cash flow, and analyze your finances with your personal AI analyst.",
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <IntegrationsSection />
      <FeaturesBento />
      <FooterSection />
    </div>
  );
}