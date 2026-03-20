import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { detectAnomalies } from "~/server/ai/anomaly-detection";

export const anomalyRouter = createTRPCRouter({
  detect: publicProcedure.query(async () => {
    return detectAnomalies();
  }),
});
