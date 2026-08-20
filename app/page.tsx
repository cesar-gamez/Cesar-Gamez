import { loadScene } from "@/lib/canvas/load-scene";
import { PortfolioCanvas } from "@/components/canvas/portfolio-canvas";

export const dynamic = "force-dynamic";

export default async function Home() {
  const scene = await loadScene();
  return <PortfolioCanvas mode="view" initialScene={scene} />;
}
