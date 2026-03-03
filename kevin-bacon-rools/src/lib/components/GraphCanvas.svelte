<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import type { Person, Knows } from "../types";

  interface Props {
    persons: Person[];
    connections: Knows[];
  }

  let { persons, connections }: Props = $props();

  let canvas: SVGSVGElement | null = $state(null);
  let width = $state(800);
  let height = $state(600);

  type Node = Person & d3.SimulationNodeDatum & { degree: number };
  type Link = d3.SimulationLinkDatum<Node> & { weight: number; id: string };

  let simulation: d3.Simulation<Node, Link> | null = null;

  $effect(() => {
    if (!canvas || persons.length === 0) return;

    const nodes: Node[] = persons.map((p) => ({
      ...p,
      degree: connections.filter(
        (c) => c.personA === p.id || c.personB === p.id,
      ).length,
    }));

    const links: Link[] = connections.map((c) => ({
      id: c.id,
      source: c.personA,
      target: c.personB,
      weight: c.weight,
    }));

    const svg = d3.select(canvas);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    // Zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    simulation = d3
      .forceSimulation<Node>(nodes)
      .force(
        "link",
        d3
          .forceLink<Node, Link>(links)
          .id((d) => (d as any).id)
          .distance(100),
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide().radius((d) => 30 + (d as Node).degree * 2),
      );

    // Links
    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#4b5563")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => 1 + d.weight);

    // Nodes
    const node = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(drag(simulation));

    node
      .append("circle")
      .attr("r", (d) => 15 + d.degree * 2)
      .attr("fill", "#1f2937")
      .attr("stroke", "#374151")
      .attr("stroke-width", 2);

    node
      .append("text")
      .text((d) => d.name || "Unknown")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => 35 + d.degree * 2)
      .attr("fill", "#9ca3af")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as any).x)
        .attr("y1", (d) => (d.source as any).y)
        .attr("x2", (d) => (d.target as any).x)
        .attr("y2", (d) => (d.target as any).y);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation?.stop();
    };
  });

  function drag(sim: d3.Simulation<Node, undefined>) {
    function dragstarted(event: any) {
      if (!event.active) sim.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) sim.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3
      .drag<any, any>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }
</script>

<div
  class="relative w-full h-[600px] bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl"
>
  <svg
    bind:this={canvas}
    class="w-full h-full cursor-grab active:cursor-grabbing"
  ></svg>

  <div
    class="absolute bottom-6 left-6 flex flex-col gap-3 p-4 bg-gray-950/40 backdrop-blur-md rounded-xl border border-gray-800/50"
  >
    <div
      class="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest"
    >
      <div
        class="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
      ></div>
      <span>Person Node</span>
    </div>
    <div
      class="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest"
    >
      <div class="w-2 h-2 rounded-full bg-gray-600"></div>
      <span>KNOWS Relationship</span>
    </div>
  </div>
</div>
