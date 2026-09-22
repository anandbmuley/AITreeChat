import { useEffect, useRef, useState } from 'react';
import ELK, { ElkNode } from 'elkjs/lib/elk.bundled.js';
import { Edge, Node } from '@xyflow/react';
import { ChatNode } from '../types/chat';

export const NODE_WIDTH = 320;
export const NODE_HEIGHT = 168;

export interface ChatFlowNodeData extends Record<string, unknown> {
  node: ChatNode;
  depth: number;
}

type FlowNode = Node<ChatFlowNodeData>;

const elk = new ELK();

const layoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.layered.spacing.nodeNodeBetweenLayers': '120',
  'elk.spacing.nodeNode': '40',
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
};

function buildFlowInputs(rootIds: string[], nodes: Record<string, ChatNode>) {
  const flowNodes: FlowNode[] = [];
  const flowEdges: Edge[] = [];

  const visit = (nodeId: string, depth: number) => {
    const node = nodes[nodeId];
    if (!node) return;

    flowNodes.push({
      id: node.id,
      type: 'chatNode',
      position: { x: 0, y: 0 },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      data: { node, depth },
    });

    node.childrenIds.forEach(childId => {
      const child = nodes[childId];
      if (!child) return;
      flowEdges.push({
        id: `e-${node.id}-${childId}`,
        source: node.id,
        target: childId,
        type: 'smoothstep',
        animated: !!child.metadata?.isMain,
      });
      visit(childId, depth + 1);
    });
  };

  rootIds.forEach(rootId => visit(rootId, 0));

  return { flowNodes, flowEdges };
}

async function layoutWithElk(flowNodes: FlowNode[], flowEdges: Edge[]) {
  const graph: ElkNode = {
    id: 'root',
    layoutOptions,
    children: flowNodes.map(n => ({
      id: n.id,
      width: n.width ?? NODE_WIDTH,
      height: n.height ?? NODE_HEIGHT,
    })),
    edges: flowEdges.map(e => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const result = await elk.layout(graph);
  const positionById = new Map<string, { x: number; y: number }>();
  (result.children ?? []).forEach(child => {
    positionById.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
  });

  return flowNodes.map(n => ({
    ...n,
    position: positionById.get(n.id) ?? n.position,
  }));
}

function graphSignature(rootIds: string[], nodes: Record<string, ChatNode>): string {
  const ids = Object.keys(nodes);
  const shape = ids.map(id => `${id}:${nodes[id].childrenIds.length}`).join('|');
  return `${rootIds.join(',')}::${ids.length}::${shape}`;
}

export function useElkLayout(rootIds: string[], nodes: Record<string, ChatNode>) {
  const [layoutedNodes, setLayoutedNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLayouting, setIsLayouting] = useState(false);
  const latestRequestId = useRef(0);
  const signature = graphSignature(rootIds, nodes);

  useEffect(() => {
    const { flowNodes, flowEdges } = buildFlowInputs(rootIds, nodes);
    if (flowNodes.length === 0) {
      setLayoutedNodes([]);
      setEdges([]);
      return;
    }

    const requestId = ++latestRequestId.current;
    setIsLayouting(true);

    layoutWithElk(flowNodes, flowEdges)
      .then(positioned => {
        if (latestRequestId.current !== requestId) return;
        setLayoutedNodes(positioned);
        setEdges(flowEdges);
      })
      .finally(() => {
        if (latestRequestId.current === requestId) {
          setIsLayouting(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return { nodes: layoutedNodes, edges, isLayouting };
}
