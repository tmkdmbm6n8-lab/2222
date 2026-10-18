import { createFileRoute } from "@tanstack/react-router";
import { SavPage } from "@/components/tclean/sav-page";
import { businessQuery, pageHead } from "@/lib/business-query";

export const Route = createFileRoute("/sav")({
  loader: ({ context }) => context.queryClient.ensureQueryData(businessQuery),
  head: ({ loaderData }) =>
    pageHead(
      loaderData ?? ({ name: "TClean" } as import("@/lib/business").BusinessConfig),
      "Service après-vente TClean",
      "Contactez le SAV TClean, créez une demande et suivez vos échanges après une prestation de nettoyage.",
      "/sav",
    ),
  component: SavPage,
});
