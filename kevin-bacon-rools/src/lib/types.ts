export interface Person {
  id: string;
  type: 'Person';
  name?: string;
  links?: string[]; // IDs of other Person objects
  created_at: number;
}

export interface Photo {
  id: string;
  type: 'Photo';
  file_reference: string;
  people?: string[]; // IDs of Person objects in this photo
  upload_timestamp: number;
}

export type RoolObject = Person | Photo;
