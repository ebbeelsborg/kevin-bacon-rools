import type { Person, Photo, Knows, Appearance, RoolObject } from './types';

export class GraphManager {
  private objects: RoolObject[];

  constructor(objects: RoolObject[]) {
    this.objects = objects;
  }

  get persons(): Person[] {
    return this.objects.filter((obj): obj is Person => obj.type === 'Person');
  }

  get photos(): Photo[] {
    return this.objects.filter((obj): obj is Photo => obj.type === 'Photo');
  }

  get appearances(): Appearance[] {
    return this.objects.filter((obj): obj is Appearance => obj.type === 'APPEARED_IN');
  }

  get connections(): Knows[] {
    return this.objects.filter((obj): obj is Knows => obj.type === 'KNOWS');
  }

  // BFS Shortest Path
  findShortestPath(startId: string, endId: string) {
    if (startId === endId) return { path: [startId], distance: 0 };

    const queue: [string, string[]][] = [[startId, [startId]]];
    const visited = new Set<string>([startId]);
    const adj = this.getAdjacencyList();

    while (queue.length > 0) {
      const [current, path] = queue.shift()!;

      for (const neighbor of adj[current] || []) {
        if (neighbor === endId) {
          return { path: [...path, endId], distance: path.length };
        }
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([neighbor, [...path, neighbor]]);
        }
      }
    }

    return null;
  }

  private getAdjacencyList(): Record<string, string[]> {
    const adj: Record<string, string[]> = {};
    for (const conn of this.connections) {
      if (!adj[conn.personA]) adj[conn.personA] = [];
      if (!adj[conn.personB]) adj[conn.personB] = [];
      adj[conn.personA].push(conn.personB);
      adj[conn.personB].push(conn.personA);
    }
    return adj;
  }

  // Analytics
  getMostConnectedPerson() {
    const counts: Record<string, number> = {};
    for (const conn of this.connections) {
      counts[conn.personA] = (counts[conn.personA] || 0) + 1;
      counts[conn.personB] = (counts[conn.personB] || 0) + 1;
    }

    let topId = '';
    let max = -1;
    for (const [id, count] of Object.entries(counts)) {
      if (count > max) {
        max = count;
        topId = id;
      }
    }

    const person = this.persons.find(p => p.id === topId);
    return person ? { ...person, connections: max } : null;
  }

  getGraphDensity(): number {
    const N = this.persons.length;
    if (N < 2) return 0;
    const E = this.connections.length;
    return (2 * E) / (N * (N - 1));
  }

  getClusteringCoefficient(personId: string): number {
    const adj = this.getAdjacencyList();
    const neighbors = adj[personId] || [];
    if (neighbors.length < 2) return 0;

    let linksBetweenNeighbors = 0;
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        if (this.hasConnection(neighbors[i], neighbors[j])) {
          linksBetweenNeighbors++;
        }
      }
    }

    const k = neighbors.length;
    return (2 * linksBetweenNeighbors) / (k * (k - 1));
  }

  private hasConnection(idA: string, idB: string): boolean {
    return this.connections.some(c =>
      (c.personA === idA && c.personB === idB) ||
      (c.personA === idB && c.personB === idA)
    );
  }

  getConnectedComponents(): string[][] {
    const adj = this.getAdjacencyList();
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const person of this.persons) {
      if (!visited.has(person.id)) {
        const component: string[] = [];
        const queue = [person.id];
        visited.add(person.id);

        while (queue.length > 0) {
          const current = queue.shift()!;
          component.push(current);
          for (const neighbor of adj[current] || []) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }
        components.push(component);
      }
    }
    return components;
  }

  getBaconNumberDistribution(centerId: string): Record<number, number> {
    const dist: Record<number, number> = {};
    const adj = this.getAdjacencyList();
    const queue: [string, number][] = [[centerId, 0]];
    const visited = new Set<string>([centerId]);

    while (queue.length > 0) {
      const [current, distance] = queue.shift()!;
      if (distance > 0) {
        dist[distance] = (dist[distance] || 0) + 1;
      }

      for (const neighbor of adj[current] || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([neighbor, distance + 1]);
        }
      }
    }
    return dist;
  }
}
