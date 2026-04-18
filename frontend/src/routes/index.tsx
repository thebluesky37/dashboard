import { createFileRoute, redirect } from "@tanstack/react-router";
import { Landing } from "@components/Landing/Landing";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (process.env.NODE_ENV === "local") {
      throw redirect({ to: "/chat" });
    }
  },
  component: Landing,
});
