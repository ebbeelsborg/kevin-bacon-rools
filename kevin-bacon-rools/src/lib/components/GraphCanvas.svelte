<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import type { Person } from "../types";

  interface Props {
    persons: Person[];
    connections: { id: string; personA: string; personB: string }[];
  }

  let { persons, connections }: Props = $props();

  let canvas: SVGSVGElement | null = $state(null);
  let width = $state(800);
  let height = $state(600);

  $effect(() => {
    if (simulation) {
      simulation.force("center", d3.forceCenter(width / 2, height / 2));
      simulation.alpha(0.1).restart();
    }
  });

  type Node = Person &
    d3.SimulationNodeDatum & { degree: number; isOrphan: boolean };
  type Link = d3.SimulationLinkDatum<Node> & { id: string };

  let simulation: d3.Simulation<Node, Link> | null = null;
  let linkGroup: any;
  let nodeGroup: any;

  onMount(() => {
    const svg = d3.select(canvas);
    linkGroup = svg.append("g");
    nodeGroup = svg.append("g");

    simulation = d3
      .forceSimulation<Node>()
      .force(
        "link",
        d3
          .forceLink<Node, Link>()
          .id((d) => (d as any).id)
          .distance(110),
      )
      .force("charge", d3.forceManyBody().strength(-250))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(45));

    simulation.on("tick", () => {
      linkGroup
        .selectAll("line")
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodeGroup
        .selectAll("g")
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => simulation?.stop();
  });

  $effect(() => {
    if (!simulation || !linkGroup || !nodeGroup) return;
    // Track persons and connections as deps so Svelte re-runs on any change
    const _p = persons.length;
    const _c = connections.length;

    const connectedIds = new Set<string>();
    connections.forEach((c) => {
      connectedIds.add(c.personA);
      connectedIds.add(c.personB);
    });

    const oldNodes = new Map(simulation.nodes().map((d) => [d.id, d]));
    const ids = new Set(persons.map((p) => p.id));

    // Orphan column: place orphans in a strip on the right side
    const orphans = persons.filter((p) => !connectedIds.has(p.id));
    const orphanColX = width - 80;
    const orphanSpacing = Math.min(
      40,
      (height - 40) / Math.max(orphans.length, 1),
    );

    const nodes: Node[] = persons.map((p, i) => {
      const old = oldNodes.get(p.id);
      const isKevin = p.name === "Kevin Bacon";
      const isOrphan = !connectedIds.has(p.id);
      const orphanIndex = orphans.indexOf(p);

      let defaultX = width / 2;
      let defaultY = height / 2;
      if (isOrphan) {
        defaultX = orphanColX;
        defaultY = 30 + orphanIndex * orphanSpacing;
      }

      return {
        ...p,
        degree: 0,
        isOrphan,
        x: old?.x ?? defaultX,
        y: old?.y ?? defaultY,
        vx: old?.vx,
        vy: old?.vy,
        fx: isKevin ? width / 2 : isOrphan ? orphanColX : null,
        fy: isKevin
          ? height / 2
          : isOrphan
            ? 30 + orphanIndex * orphanSpacing
            : null,
      };
    });

    const links = connections
      .filter((c) => ids.has(c.personA) && ids.has(c.personB))
      .map((c) => ({
        id: c.id,
        source: c.personA,
        target: c.personB,
      }));

    simulation.nodes(nodes);
    const linkForce: any = simulation.force("link");
    linkForce.links(links);

    linkGroup
      .selectAll("line")
      .data(links, (d: any) => d.id)
      .join("line")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.7);

    const g = nodeGroup
      .selectAll("g")
      .data(nodes, (d: any) => d.id)
      .join("g");

    g.selectAll("*").remove();

    // Orphans get a dimmer, smaller appearance
    g.append("circle")
      .attr("r", (d: any) => (d.isOrphan ? 6 : 8))
      .attr("fill", (d: any) => {
        if (d.name === "Kevin Bacon") return "#ef4444";
        if (d.isOrphan) return "#94a3b8";
        return "#22c55e";
      })
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5)
      .attr("opacity", (d: any) => (d.isOrphan ? 0.6 : 1.0));

    g.append("text")
      .text((d: any) => d.name)
      .attr("text-anchor", (d: any) => (d.isOrphan ? "end" : "middle"))
      .attr("dx", (d: any) => (d.isOrphan ? -10 : 0))
      .attr("dy", (d: any) => (d.isOrphan ? 4 : 25))
      .attr("fill", (d: any) => (d.isOrphan ? "#94a3b8" : "#475569"))
      .attr("font-size", (d: any) => (d.isOrphan ? "10px" : "11px"))
      .attr("font-weight", "600");

    // Always restart — we always want the simulation to settle properly
    // after any data change. The alpha controls how energetic it is.
    const prevLength = _p; // referenced to avoid dead-code elimination
    simulation.alpha(nodes.length !== oldNodes.size ? 0.4 : 0.15).restart();
  });
</script>

<div
  bind:clientWidth={width}
  bind:clientHeight={height}
  class="w-full h-full bg-white relative overflow-hidden"
>
  <svg bind:this={canvas} class="w-full h-full"></svg>
  {#if persons.length === 0}
    <div
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <p class="text-slate-300 text-sm font-medium italic">
        Upload a photo to start building the graph
      </p>
    </div>
  {/if}
</div>
