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

  type Node = Person & d3.SimulationNodeDatum & { degree: number };
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
          .distance(100),
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40));

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

    const oldNodes = new Map(simulation.nodes().map((d) => [d.id, d]));
    const ids = new Set(persons.map((p) => p.id));
    const nodes: Node[] = persons.map((p) => {
      const old = oldNodes.get(p.id);
      const isKevin = p.name === "Kevin Bacon";
      return {
        ...p,
        degree: 0,
        x: old?.x ?? width / 2,
        y: old?.y ?? height / 2,
        vx: old?.vx,
        vy: old?.vy,
        fx: isKevin ? width / 2 : null,
        fy: isKevin ? height / 2 : null,
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
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 1.5);

    const g = nodeGroup
      .selectAll("g")
      .data(nodes, (d: any) => d.id)
      .join("g");

    g.selectAll("*").remove();

    g.append("circle")
      .attr("r", 8)
      .attr("fill", (d: any) =>
        d.name === "Kevin Bacon" ? "#ef4444" : "#22c55e",
      )
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5);

    g.append("text")
      .text((d: any) => d.name)
      .attr("text-anchor", "middle")
      .attr("dy", 25)
      .attr("fill", "#64748b")
      .attr("font-size", "11px")
      .attr("font-weight", "600");

    if (nodes.length !== oldNodes.size) {
      simulation.alpha(0.3).restart();
    }
  });
</script>

<div
  bind:clientWidth={width}
  bind:clientHeight={height}
  class="w-full h-full bg-white relative overflow-hidden"
>
  <svg bind:this={canvas} class="w-full h-full"></svg>
</div>
