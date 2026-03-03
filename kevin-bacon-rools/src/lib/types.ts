export interface Person {
  id: string;
  type: 'Person';
  name?: string;
  face_embedding?: number[];
  created_at: number;
}

export interface Photo {
  id: string;
  type: 'Photo';
  file_reference: string; // Base64 for simplicity in this demo or Rool space reference
  upload_timestamp: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Appearance {
  id: string;
  type: 'APPEARED_IN';
  personId: string;
  photoId: string;
  boundingBox: BoundingBox;
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

export type RoolObject = Person | Photo | Appearance | Knows;
