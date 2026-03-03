import type { Person, Photo, RoolObject } from './types';

export class GraphManager {
  private objects: RoolObject[];

  constructor(objects: RoolObject[]) {
    this.objects = objects;
  }

  get persons(): Person[] {
    return this.objects.filter((obj): obj is Person => obj.type?.toLowerCase() === 'person');
  }

  get photos(): Photo[] {
    return this.objects.filter((obj): obj is Photo => obj.type?.toLowerCase() === 'photo');
  }

  get connections(): { id: string; personA: string; personB: string }[] {
    const links: { id: string; personA: string; personB: string }[] = [];
    const seen = new Set<string>();

    for (const person of this.persons) {
      if (!person.links) continue;
      for (const targetId of person.links) {
        // Create a stable deterministic key for deduplication
        const pair = [person.id, targetId].sort();
        const key = pair.join('-');

        if (!seen.has(key)) {
          seen.add(key);
          links.push({
            id: key,
            personA: pair[0],
            personB: pair[1]
          });
        }
      }
    }
    return links;
  }
}
