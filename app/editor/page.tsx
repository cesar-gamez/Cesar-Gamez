import type { Metadata } from "next";
import { loadScene } from "@/lib/canvas/load-scene";
import { PortfolioCanvas } from "@/components/canvas/portfolio-canvas";

export const metadata: Metadata = {
  title: "Editor — CesarGamez",
  description: "Arrange the Cesar Gamez canvas",
  robots: { index: false, follow: false },
};

export default async function EditorPage() {
  const scene = await loadScene();
  return <PortfolioCanvas mode="edit" initialScene={scene} />;
}
