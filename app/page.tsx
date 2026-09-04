import { PortfolioCanvas } from "@/components/canvas/portfolio-canvas";
import { detailIdFromSearchParams } from "@/lib/canvas/detail-url";
import { loadScene } from "@/lib/canvas/load-scene";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: PageProps<"/">) {
  const scene = await loadScene();
  const params = await searchParams;
  return (
    <PortfolioCanvas
      mode="view"
      initialScene={scene}
      initialDetailId={detailIdFromSearchParams(params)}
    />
  );
}
