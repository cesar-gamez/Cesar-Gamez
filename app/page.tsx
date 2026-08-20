import { loadScene } from "@/lib/canvas/load-scene";
import { PortfolioCanvas } from "@/components/canvas/portfolio-canvas";

export default async function Home() {
  const scene = await loadScene();
  return <PortfolioCanvas mode="view" initialScene={scene} />;
}
