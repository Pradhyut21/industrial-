import { createFileRoute } from "@tanstack/react-router";
import { DeadMindOfficeView } from "@/components/DeadMindOfficeView";

export const Route = createFileRoute("/office")({
  head: () => ({
    meta: [
      { title: "Plant Office Floor — Multi-Agent Team Simulation | DeadMind" },
      { name: "description", content: "DeadMind multi-agent office simulation with team pods and project-level knowledge isolation." },
    ],
  }),
  component: DeadMindOfficeView,
});
