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
  type Link = d3.SimulationLinkDatum<Node> & { id: string };

  let simulation: d3.Simulation<Node, Link> | null = null;
  let linkGroup: any;
  let nodeGroup: any;
  let defs: any;

  onMount(() => {
    const svg = d3.select(canvas);
    defs = svg.append("defs");
    linkGroup = svg.append("g");
    nodeGroup = svg.append("g");

    simulation = d3
      .forceSimulation<Node>()
      .force(
        "link",
        d3
          .forceLink<Node, Link>()
          .id((d) => (d as any).id)
          .distance(150),
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(60));

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

    console.log("GraphCanvas Persons Data:", persons);

    const nodesWithImages = persons.filter((p) => p.image_url);
    console.log("Nodes with images:", nodesWithImages);

    // Update Patterns
    const patternJoin = defs
      .selectAll("pattern")
      .data(nodesWithImages, (d: any) => d.id)
      .join("pattern")
      .attr("id", (d: any) => `pattern-${d.id}`)
      .attr("width", 1)
      .attr("height", 1)
      .attr("patternContentUnits", "objectBoundingBox");

    patternJoin
      .selectAll("image")
      .data((d) => [d])
      .join("image")
      .attr("href", (d: any) => d.image_url)
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 1)
      .attr("height", 1)
      .attr("preserveAspectRatio", "xMidYMid slice")
      .on("error", (e: any) => console.error("Pattern image load error:", e));

    const oldNodes = new Map(simulation.nodes().map((d) => [d.id, d]));
    const nodes: Node[] = persons.map((p) => {
      const old = oldNodes.get(p.id);
      return {
        ...p,
        degree: 0,
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
    }));

    simulation.nodes(nodes);
    const linkForce: any = simulation.force("link");
    linkForce.links(links);

    linkGroup
      .selectAll("line")
      .data(links, (d: any) => d.id)
      .join("line")
      .attr("stroke", "#374151")
      .attr("stroke-width", 2);

    const g = nodeGroup
      .selectAll("g")
      .data(nodes, (d: any) => d.id)
      .join("g");

    // Clear and redraw circle to ensure reference is fresh
    g.selectAll("circle").remove();
    g.append("circle")
      .attr("r", 30)
      .attr("fill", (d: any) =>
        d.image_url ? `url(#pattern-${d.id})` : "#111827",
      )
      .attr("stroke", (d: any) =>
        d.name === "Kevin Bacon" ? "#ef4444" : "#22c55e",
      )
      .attr("stroke-width", 2.5)
      .style("filter", "drop-shadow(0 4px 6px rgba(0,0,0,0.5))");

    g.selectAll("text").remove();
    g.append("text")
      .text((d: any) => d.name)
      .attr("text-anchor", "middle")
      .attr("dy", 55)
      .attr("fill", "#F3F4F6")
      .attr("font-size", "12px")
      .attr("font-weight", "700")
      .attr("class", "node-label");

    if (nodes.length !== oldNodes.size) {
      simulation.alpha(0.3).restart();
    }
  });
</script>

<div
  class="w-full h-[600px] bg-gray-900 rounded-3xl overflow-hidden border border-gray-800 shadow-2xl relative"
>
  <svg bind:this={canvas} class="w-full h-full"></svg>
</div>

<style>
  .node-label {
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  }
</style>
