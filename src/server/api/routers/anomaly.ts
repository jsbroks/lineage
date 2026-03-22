import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { detectAnomalies } from "~/server/ai/anomaly-detection";

export const anomalyRouter = createTRPCRouter({
  detect: protectedProcedure.query(async () => {
    return detectAnomalies();
  }),
});
