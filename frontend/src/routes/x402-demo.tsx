import { createFileRoute } from "@tanstack/react-router";
import { X402DemoView } from "@/components/X402DemoView";

// Note: tsc may report a type error on the route path until `vite dev` or
// `vite build` regenerates routeTree.gen.ts with this route included.
// This is expected for any new route file before the first build completes.
export const Route = createFileRoute("/x402-demo")({
  head: () => ({
    meta: [
      { title: "x402 Payment Demo — Algorand Micropayment Gate | DeadMind" },
      {
        name: "description",
        content:
          "Live x402 Algorand micropayment demonstration: connect your Pera wallet, pay for a gated engineering brief, and verify settlement on Lora.",
      },
    ],
  }),
  component: X402DemoView,
});
