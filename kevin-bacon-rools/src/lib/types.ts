export interface Person {
  id: string;
  type: 'Person';
  name?: string;
  created_at: number;
}

export interface Photo {
  id: string;
  type: 'Photo';
  file_reference: string;
  upload_timestamp: number;
}

export interface Knows {
  id: string;
  type: 'KNOWS';
  personA: string;
  personB: string;
  weight: number;
  created_at: number;
  updated_at: number;
}

export interface Appearance {
  id: string;
  type: 'APPEARED_IN';
  personId: string;
  photoId: string;
}

export type RoolObject = Person | Photo | Appearance | Knows;
