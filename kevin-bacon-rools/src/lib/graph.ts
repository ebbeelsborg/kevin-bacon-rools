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
}
