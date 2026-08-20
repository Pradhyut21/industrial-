import { createFileRoute } from "@tanstack/react-router";
import { MunderOfficeView } from "@/components/MunderOfficeView";

export const Route = createFileRoute("/office")({
  head: () => ({
    meta: [
      { title: "Plant Office Floor — Multi-Agent Team Simulation | DeadMind" },
      { name: "description", content: "Authentic Munder Difflin multi-agent office simulation with team pods and project-level knowledge isolation." },
    ],
  }),
  component: MunderOfficeView,
});
