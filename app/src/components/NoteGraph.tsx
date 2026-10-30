import { useMemo, useState } from 'react';
import { extractLinks } from '../lib/markdown';
import type { Note } from '../lib/types';

const W = 332;
const H = 320;

type SimNode = { id: string; title: string; x: number; y: number; vx: number; vy: number; deg: number };

/**
 * A tiny deterministic force graph — no d3, no layout library. Positions are
 * solved once per note-set, so the "constellation" is stable between renders.
 */
export function NoteGraph({ notes, onOpen }: { notes: Note[]; onOpen: (n: Note) => void }) {
  const [hover, setHover] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    const visible = notes.slice(0, 26);
    const byTitle = new Map(visible.map((n) => [n.title.toLowerCase(), n.id]));

    const sim: SimNode[] = visible.map((n, i) => {
      const a = (i / Math.max(1, visible.length)) * Math.PI * 2;
      const r = 60 + ((i * 37) % 60);
      return {
        id: n.id,
        title: n.title,
        x: W / 2 + Math.cos(a) * r + ((i * 13) % 17) - 8,
        y: H / 2 + Math.sin(a) * r + ((i * 7) % 15) - 7,
        vx: 0,
        vy: 0,
        deg: 0,
      };
    });
    const index = new Map(sim.map((n, i) => [n.id, i]));

    const e: { a: number; b: number }[] = [];
    for (const n of visible) {
      for (const link of extractLinks(n.body)) {
        const targetId = byTitle.get(link.toLowerCase());
        if (!targetId || targetId === n.id) continue;
        const a = index.get(n.id)!;
        const b = index.get(targetId)!;
        if (e.some((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))) continue;
        e.push({ a, b });
        sim[a].deg++;
        sim[b].deg++;
      }
    }

    // force relaxation
    for (let iter = 0; iter < 240; iter++) {
      const cool = 1 - iter / 240;
      for (let i = 0; i < sim.length; i++) {
        for (let j = i + 1; j < sim.length; j++) {
          const dx = sim[i].x - sim[j].x;
          const dy = sim[i].y - sim[j].y;
          const d2 = Math.max(60, dx * dx + dy * dy);
          const f = 2600 / d2;
          const d = Math.sqrt(d2);
          sim[i].vx += (dx / d) * f;
          sim[i].vy += (dy / d) * f;
          sim[j].vx -= (dx / d) * f;
          sim[j].vy -= (dy / d) * f;
        }
      }
      for (const { a, b } of e) {
        const dx = sim[b].x - sim[a].x;
        const dy = sim[b].y - sim[a].y;
        const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const f = (d - 78) * 0.012;
        sim[a].vx += (dx / d) * f;
        sim[a].vy += (dy / d) * f;
        sim[b].vx -= (dx / d) * f;
        sim[b].vy -= (dy / d) * f;
      }
      for (const n of sim) {
        n.vx += (W / 2 - n.x) * 0.004;
        n.vy += (H / 2 - n.y) * 0.004;
        n.x += n.vx * cool;
        n.y += n.vy * cool;
        n.vx *= 0.72;
        n.vy *= 0.72;
        n.x = Math.min(W - 22, Math.max(22, n.x));
        n.y = Math.min(H - 22, Math.max(22, n.y));
      }
    }

    return { nodes: sim, edges: e };
  }, [notes]);

  const neighbors = useMemo(() => {
    if (!hover) return new Set<string>();
    const idx = nodes.findIndex((n) => n.id === hover);
    const set = new Set<string>([hover]);
    edges.forEach(({ a, b }) => {
      if (a === idx) set.add(nodes[b].id);
      if (b === idx) set.add(nodes[a].id);
    });
    return set;
  }, [hover, nodes, edges]);

  return (
    <div className="graphwrap">
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Note graph">
        {edges.map(({ a, b }, i) => {
          const active =
            hover && (nodes[a].id === hover || nodes[b].id === hover);
          return (
            <line
              key={i}
              className="graph__edge"
              x1={nodes[a].x}
              y1={nodes[a].y}
              x2={nodes[b].x}
              y2={nodes[b].y}
              style={{
                stroke: active ? 'var(--accent)' : undefined,
                strokeOpacity: hover ? (active ? 0.9 : 0.18) : 0.6,
                transition: 'stroke-opacity .2s',
              }}
            />
          );
        })}
        {nodes.map((n) => {
          const note = notes.find((x) => x.id === n.id)!;
          const r = 5 + Math.min(6, n.deg * 1.4);
          const dim = hover ? !neighbors.has(n.id) : false;
          return (
            <g
              key={n.id}
              className="graph__node"
              transform={`translate(${n.x},${n.y})`}
              style={{ opacity: dim ? 0.32 : 1, transition: 'opacity .2s', cursor: 'pointer' }}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onOpen(note)}
            >
              <circle r={r} />
              <circle r={2} fill="var(--accent)" opacity={0.85} />
              <text
                y={r + 9}
                textAnchor="middle"
                style={{ fontSize: 7.2, fill: dim ? 'var(--muted-2)' : 'var(--muted)' }}
              >
                {n.title.length > 22 ? `${n.title.slice(0, 21)}…` : n.title || 'Untitled'}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
