import type { SeedOperationType } from "../../types";
import type { WorkflowFlags } from "../config";
import { buildBatchOperations } from "./batch";
import { buildBlockOperations } from "./block";
import { buildTrayOperations } from "./tray";
import { buildRoomMetricsOperation } from "./room-metrics";

export function buildOperations(flags: WorkflowFlags): SeedOperationType[] {
  const ops: SeedOperationType[] = [];

  if (flags.batchTracking) {
    ops.push(...buildBatchOperations());
  }
  if (flags.blockTracking) {
    ops.push(...buildBlockOperations(flags.batchTracking));
  }

  ops.push({
    name: "Print Labels",
    description: "Print QR code labels for lots",
    icon: "printer",
    color: "#1E293B",
    category: "admin",
  });

  if (flags.trayTracking) {
    ops.push(...buildTrayOperations());
  }
  if (flags.roomMetrics) {
    ops.push(buildRoomMetricsOperation());
  }

  return ops;
}
