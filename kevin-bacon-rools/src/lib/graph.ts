import type { Person, Photo, Knows, Appearance, RoolObject } from './types';

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

  get appearances(): Appearance[] {
    return this.objects.filter((obj): obj is Appearance => obj.type?.toLowerCase() === 'appeared_in');
  }

  get connections(): Knows[] {
    return this.objects.filter((obj): obj is Knows => obj.type?.toLowerCase() === 'knows');
  }
}
