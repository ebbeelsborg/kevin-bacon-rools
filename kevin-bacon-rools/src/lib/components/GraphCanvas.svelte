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
  let nodeGroup: any;
  let linkGroup: any;

  onMount(() => {
    const svg = d3.select(canvas);
    linkGroup = svg.append("g").attr("class", "links");
    nodeGroup = svg.append("g").attr("class", "nodes");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        linkGroup.attr("transform", event.transform);
        nodeGroup.attr("transform", event.transform);
      });

    svg.call(zoom);

    simulation = d3
      .forceSimulation<Node>()
      .force(
        "link",
        d3
          .forceLink<Node, Link>()
          .id((d) => (d as any).id)
          .distance(100),
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide().radius((d) => 35 + (d as Node).degree * 2),
      );

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
    if (!simulation || persons.length === 0) return;

    // Maintain existing nodes to preserve positions
    const oldNodes = new Map(simulation.nodes().map((d) => [d.id, d]));

    const nodes: Node[] = persons.map((p) => {
      const old = oldNodes.get(p.id);
      return {
        ...p,
        degree: connections.filter(
          (c) => c.personA === p.id || c.personB === p.id,
        ).length,
        x: old?.x,
        y: old?.y,
        vx: old?.vx,
        vy: old?.vy,
      };
    });

    const links: Link[] = connections.map((c) => ({
      id: c.id,
      source: c.personA,
      target: c.personB,
      weight: c.weight,
    }));

    simulation.nodes(nodes);
    const linkForce: any = simulation.force("link");
    linkForce.links(links);

    // Update Links
    linkGroup
      .selectAll("line")
      .data(links, (d: any) => d.id)
      .join("line")
      .attr("stroke", "#4b5563")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d: any) => 1 + d.weight);

    // Update Nodes
    const nodeJoin = nodeGroup
      .selectAll("g")
      .data(nodes, (d: any) => d.id)
      .join(
        (enter: any) => {
          const g = enter.append("g").call(drag(simulation!));
          g.append("circle")
            .attr("r", (d: any) => 15 + d.degree * 2)
            .attr("fill", "#1f2937")
            .attr("stroke", "#374151")
            .attr("stroke-width", 2);
          g.append("text")
            .text((d: any) => d.name || "Unknown")
            .attr("text-anchor", "middle")
            .attr("dy", (d: any) => 35 + d.degree * 2)
            .attr("fill", "#9ca3af")
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .style("pointer-events", "none");
          return g;
        },
        (update: any) => {
          update.select("circle").attr("r", (d: any) => 15 + d.degree * 2);
          update.select("text").attr("dy", (d: any) => 35 + d.degree * 2);
          return update;
        },
      );

    simulation.alpha(0.3).restart();
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
</div>
