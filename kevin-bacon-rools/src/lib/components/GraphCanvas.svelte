<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import type { Person, Knows } from '../types';

  interface Props {
    persons: Person[];
    connections: Knows[];
    shortestPath?: string[] | null;
    onNodeClick?: (id: string) => void;
  }

  let { persons, connections, shortestPath, onNodeClick }: Props = $props();

  let canvas: SVGSVGElement | null = $state(null);
  let width = $state(800);
  let height = $state(600);

  type Node = Person & d3.SimulationNodeDatum & { degree: number };
  type Link = d3.SimulationLinkDatum<Node> & { weight: number; id: string };

  let simulation: d3.Simulation<Node, Link> | null = null;

  $effect(() => {
    if (!canvas || persons.length === 0) return;

    const nodes: Node[] = persons.map(p => ({
      ...p,
      degree: connections.filter(c => c.personA === p.id || c.personB === p.id).length
    }));

    const links: Link[] = connections.map(c => ({
      id: c.id,
      source: c.personA,
      target: c.personB,
      weight: c.weight
    }));

    const svg = d3.select(canvas);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    
    svg.call(zoom);

    simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => 30 + (d as Node).degree * 2));

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#4b5563')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => 1 + d.weight);

    // Nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(drag(simulation))
      .on('click', (event, d) => onNodeClick?.(d.id));

    node.append('circle')
      .attr('r', d => 15 + d.degree * 2)
      .attr('fill', d => shortestPath?.includes(d.id) ? '#3b82f6' : '#1f2937')
      .attr('stroke', d => shortestPath?.includes(d.id) ? '#60a5fa' : '#374151')
      .attr('stroke-width', 2)
      .attr('class', d => shortestPath?.includes(d.id) ? 'animate-pulse' : '');

    node.append('text')
      .text(d => d.name || 'Unknown')
      .attr('text-anchor', 'middle')
      .attr('dy', d => 30 + d.degree * 2)
      .attr('fill', '#f3f4f6')
      .attr('font-size', '12px')
      .style('pointer-events', 'none');

    // Highlight shortest path
    if (shortestPath && shortestPath.length > 1) {
      link.attr('stroke', d => {
        const sourceId = typeof d.source === 'string' ? d.source : (d.source as any).id;
        const targetId = typeof d.target === 'string' ? d.target : (d.target as any).id;
        const idxA = shortestPath.indexOf(sourceId);
        const idxB = shortestPath.indexOf(targetId);
        if (idxA !== -1 && idxB !== -1 && Math.abs(idxA - idxB) === 1) {
          return '#3b82f6';
        }
        return '#4b5563';
      })
      .attr('stroke-opacity', d => {
        const sourceId = typeof d.source === 'string' ? d.source : (d.source as any).id;
        const targetId = typeof d.target === 'string' ? d.target : (d.target as any).id;
        const idxA = shortestPath.indexOf(sourceId);
        const idxB = shortestPath.indexOf(targetId);
        return (idxA !== -1 && idxB !== -1 && Math.abs(idxA - idxB) === 1) ? 1 : 0.3;
      })
      .attr('stroke-width', d => {
        const sourceId = typeof d.source === 'string' ? d.source : (d.source as any).id;
        const targetId = typeof d.target === 'string' ? d.target : (d.target as any).id;
        const idxA = shortestPath.indexOf(sourceId);
        const idxB = shortestPath.indexOf(targetId);
        return (idxA !== -1 && idxB !== -1 && Math.abs(idxA - idxB) === 1) ? 4 : 1 + d.weight;
      });
    }

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
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

    return d3.drag<any, any>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }
</script>

<div class="relative w-full h-[600px] bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
  <svg bind:this={canvas} class="w-full h-full cursor-grab active:cursor-grabbing"></svg>
  
  <div class="absolute bottom-4 left-4 flex flex-col gap-2">
    <div class="flex items-center gap-2 text-xs text-gray-400">
      <div class="w-3 h-3 rounded-full bg-blue-500"></div>
      <span>Selected Path</span>
    </div>
    <div class="flex items-center gap-2 text-xs text-gray-400">
      <div class="w-3 h-3 rounded-full bg-gray-700"></div>
      <span>Person</span>
    </div>
  </div>
</div>

<style>
  .animate-pulse {
    filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.5));
  }
</style>
