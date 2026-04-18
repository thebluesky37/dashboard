import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/Home/Main";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (process.env.NODE_ENV !== "local") {
      throw redirect({ to: "/" });
    }
  },
  component: AppLayout,
});
