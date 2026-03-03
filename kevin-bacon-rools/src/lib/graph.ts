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
    const personIds = new Set(this.persons.map(p => p.id));

    const addLink = (a: string, b: string) => {
      if (!personIds.has(a) || !personIds.has(b) || a === b) return;
      const pair = [a, b].sort();
      const key = pair.join('-');
      if (!seen.has(key)) {
        seen.add(key);
        links.push({ id: key, personA: pair[0], personB: pair[1] });
      }
    };

    // Primary: derive from Photo.people arrays — most reliable source
    for (const photo of this.photos) {
      const people = this.parsePeopleArray(photo.people);
      for (let i = 0; i < people.length; i++) {
        for (let j = i + 1; j < people.length; j++) {
          addLink(people[i], people[j]);
        }
      }
    }

    // Secondary: also derive from Person.links for any additional connections
    // (e.g., manually set connections not tied to a specific photo)
    for (const person of this.persons) {
      const targets = this.parsePeopleArray(person.links);
      for (const targetId of targets) {
        addLink(person.id, targetId);
      }
    }

    return links;
  }

  /** Safely parse what might be a proper array or a comma-smashed string */
  private parsePeopleArray(val: string[] | undefined): string[] {
    if (!val || !Array.isArray(val)) return [];
    if (val.length === 1 && typeof val[0] === 'string' && val[0].includes(',')) {
      // AI produced comma-separated string inside array — recover it
      return val[0].split(',').map(s => s.trim()).filter(Boolean);
    }
    return val.map(s => (typeof s === 'string' ? s.trim() : '')).filter(Boolean);
  }
}
