"use client";

import { useMemo, useState, useCallback } from "react";
import {
  ReactFlow,
  BaseEdge,
  type Node,
  type Edge,
  type EdgeProps,
  type NodeProps,
  type NodeMouseHandler,
  Position,
  Handle,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface Status {
  id: string;
  name: string;
  color: string | null;
  category: string;
  ordinal: number;
}

interface Transition {
  id: string;
  fromStatusId: string;
  toStatusId: string;
}

interface StatusFlowDiagramProps {
  statuses: Status[];
  transitions: Transition[];
}

const CATEGORY_COLORS: Record<string, string> = {
  unstarted: "#94a3b8",
  in_progress: "#3b82f6",
  done: "#22c55e",
  canceled: "#ef4444",
};

function resolveColor(status: Status): string {
  if (status.color) return status.color;
  return CATEGORY_COLORS[status.category] ?? "#94a3b8";
}

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(148,163,184,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

type StatusNodeData = {
  label: string;
  color: string;
  dimmed?: boolean;
  hovered?: boolean;
};

const NODE_W = 130;
const NODE_H = 36;

function StatusNode({ data }: NodeProps<Node<StatusNodeData>>) {
  const dimmed = data.dimmed ?? false;
  const hovered = data.hovered ?? false;

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="h-0! w-0! border-0! bg-transparent!"
      />
      <Handle
        type="target"
        id="top"
        position={Position.Top}
        className="h-0! w-0! border-0! bg-transparent!"
      />
      <Handle
        type="target"
        id="bottom"
        position={Position.Bottom}
        className="h-0! w-0! border-0! bg-transparent!"
      />
      <div
        className="flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150 select-none"
        style={{
          borderColor: data.color,
          backgroundColor: hexToRgba(data.color, hovered ? 0.2 : 0.1),
          color: data.color,
          width: NODE_W,
          height: NODE_H,
          opacity: dimmed ? 0.2 : 1,
          boxShadow: hovered
            ? `0 0 0 2px ${hexToRgba(data.color, 0.3)}`
            : "none",
          cursor: "pointer",
        }}
      >
        {data.label}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="h-0! w-0! border-0! bg-transparent!"
      />
      <Handle
        type="source"
        id="top"
        position={Position.Top}
        className="h-0! w-0! border-0! bg-transparent!"
      />
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="h-0! w-0! border-0! bg-transparent!"
      />
    </>
  );
}

function ArcEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  data,
}: EdgeProps) {
  const arcSide =
    (data?.arcSide as "above" | "below" | "straight") ?? "straight";
  const span = (data?.span as number) ?? 1;

  if (arcSide === "straight") {
    const path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />;
  }

  const arcHeight = 40 + span * 25;
  const sign = arcSide === "above" ? -1 : 1;
  const mx = (sourceX + targetX) / 2;
  const cy = sourceY + sign * arcHeight;

  const path = `M ${sourceX} ${sourceY} Q ${mx} ${cy} ${targetX} ${targetY}`;
  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />;
}

const nodeTypes = { status: StatusNode };
const edgeTypes = { arc: ArcEdge };

const H_GAP = 60;

function horizontalLayout(count: number) {
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    positions.push({
      x: i * (NODE_W + H_GAP),
      y: 0,
    });
  }
  return positions;
}

function FlowInner({ statuses, transitions }: StatusFlowDiagramProps) {
  const sorted = useMemo(
    () => [...statuses].sort((a, b) => a.ordinal - b.ordinal),
    [statuses],
  );

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const { baseNodes, baseEdges } = useMemo(() => {
    const n = sorted.length;
    const positions = horizontalLayout(n);

    const flowNodes: Node<StatusNodeData>[] = sorted.map((s, i) => ({
      id: s.id,
      type: "status",
      position: positions[i]!,
      data: { label: s.name, color: resolveColor(s) },
      draggable: false,
      selectable: false,
      connectable: false,
    }));

    const indexById = new Map(sorted.map((s, i) => [s.id, i]));

    const pairKey = (a: string, b: string) =>
      a < b ? `${a}:${b}` : `${b}:${a}`;
    const hasBidi = new Set<string>();
    for (const t of transitions) {
      if (
        transitions.some(
          (u) =>
            u.fromStatusId === t.toStatusId && u.toStatusId === t.fromStatusId,
        )
      ) {
        hasBidi.add(pairKey(t.fromStatusId, t.toStatusId));
      }
    }

    const flowEdges: Edge[] = [];

    for (const t of transitions) {
      const fromIdx = indexById.get(t.fromStatusId);
      const toIdx = indexById.get(t.toStatusId);
      if (fromIdx === undefined || toIdx === undefined) continue;
      if (t.fromStatusId === t.toStatusId) continue;

      const fromStatus = sorted[fromIdx]!;
      const color = resolveColor(fromStatus);
      const bidi = hasBidi.has(pairKey(t.fromStatusId, t.toStatusId));
      const isForward = fromIdx < toIdx;
      const span = Math.abs(toIdx - fromIdx);
      const isAdjacent = span === 1;

      let arcSide: "above" | "below" | "straight";
      let sourceHandle: string | undefined;
      let targetHandle: string | undefined;

      if (isForward && isAdjacent && !bidi) {
        arcSide = "straight";
      } else if (isForward && bidi) {
        arcSide = "above";
        sourceHandle = "top";
        targetHandle = "top";
      } else if (!isForward && bidi) {
        arcSide = "below";
        sourceHandle = "bottom";
        targetHandle = "bottom";
      } else if (isForward && !isAdjacent) {
        arcSide = "above";
        sourceHandle = "top";
        targetHandle = "top";
      } else {
        arcSide = "below";
        sourceHandle = "bottom";
        targetHandle = "bottom";
      }

      flowEdges.push({
        id: t.id,
        source: t.fromStatusId,
        target: t.toStatusId,
        sourceHandle,
        targetHandle,
        type: "arc",
        data: { arcSide, span },
        style: { stroke: color, strokeWidth: 1.5, opacity: 0.6 },
        markerEnd: {
          type: "arrowclosed" as const,
          color,
          width: 16,
          height: 16,
        },
      });
    }

    return { baseNodes: flowNodes, baseEdges: flowEdges };
  }, [sorted, transitions]);

  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return null;
    const ids = new Set<string>([hoveredNodeId]);
    for (const e of baseEdges) {
      if (e.source === hoveredNodeId || e.target === hoveredNodeId) {
        ids.add(e.source);
        ids.add(e.target);
      }
    }
    return ids;
  }, [hoveredNodeId, baseEdges]);

  const nodes = useMemo(() => {
    if (!connectedNodeIds) return baseNodes;
    return baseNodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        dimmed: !connectedNodeIds.has(n.id),
        hovered: n.id === hoveredNodeId,
      },
    }));
  }, [baseNodes, connectedNodeIds, hoveredNodeId]);

  const edges = useMemo(() => {
    if (!hoveredNodeId) return baseEdges;
    return baseEdges.map((e) => {
      const connected =
        e.source === hoveredNodeId || e.target === hoveredNodeId;
      return {
        ...e,
        style: {
          ...e.style,
          opacity: connected ? 0.85 : 0.08,
          strokeWidth: connected ? 2.5 : 1,
        },
        markerEnd: connected
          ? e.markerEnd
          : typeof e.markerEnd === "object"
            ? { ...e.markerEnd, color: "#d1d5db" }
            : e.markerEnd,
      };
    });
  }, [baseEdges, hoveredNodeId]);

  const onNodeMouseEnter: NodeMouseHandler = useCallback((_event, node) => {
    setHoveredNodeId(node.id);
  }, []);

  const onNodeMouseLeave: NodeMouseHandler = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  if (sorted.length < 2) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Status Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusFlowDiagram(props: StatusFlowDiagramProps) {
  const sorted = [...props.statuses].sort((a, b) => a.ordinal - b.ordinal);
  if (sorted.length < 2) return null;

  return (
    <ReactFlowProvider>
      <FlowInner {...props} />
    </ReactFlowProvider>
  );
}
