import type { ReactiveSpace } from '@rool-dev/svelte';
import type { Person, Photo, Appearance, Knows, RoolObject } from './types';

export async function ingestPhoto(space: ReactiveSpace, fileData: string) {
  // 1. Create Photo node
  const { object: photo } = await space.createObject({
    data: {
      type: 'Photo',
      file_reference: fileData,
      upload_timestamp: Date.now()
    }
  });

  // 2. Mock face detection
  const detectedFaces = mockDetectFaces(fileData);

  const personNodes: Person[] = [];
  for (const face of detectedFaces) {
    // 3. Create temporary Person node (untagged)
    const { object: person } = await space.createObject({
      data: {
        type: 'Person',
        created_at: Date.now()
      }
    });
    personNodes.push(person as unknown as Person);

    // 4. Create APPEARED_IN relationship
    await space.createObject({
      data: {
        type: 'APPEARED_IN',
        personId: person.id,
        photoId: photo.id,
        boundingBox: face.boundingBox
      }
    });
  }

  return { photo: photo as unknown as Photo, personNodes };
}

export async function tagPerson(space: ReactiveSpace, personId: string, name: string, allObjects: RoolObject[]) {
  const existingPerson = allObjects.find(obj => obj.type === 'Person' && obj.name === name) as Person | undefined;

  if (existingPerson && existingPerson.id !== personId) {
    // MERGE logic
    const appearances = allObjects.filter(obj => obj.type === 'APPEARED_IN' && obj.personId === personId) as Appearance[];

    for (const app of appearances) {
      await space.updateObject(app.id, { data: { personId: existingPerson.id } });
    }

    await space.deleteObjects([personId]);
    await updateConnectionsForPerson(space, existingPerson.id, allObjects);
    return existingPerson;
  } else {
    const { object: updated } = await space.updateObject(personId, { data: { name } });
    await updateConnectionsForPerson(space, personId, allObjects);
    return updated as unknown as Person;
  }
}

async function updateConnectionsForPerson(space: ReactiveSpace, personId: string, allObjects: RoolObject[]) {
  const appearances = allObjects.filter(obj => obj.type === 'APPEARED_IN' && obj.personId === personId) as Appearance[];
  const photoIds = new Set(appearances.map(a => a.photoId));

  const otherPeopleIds = new Set<string>();
  for (const photoId of photoIds) {
    const othersInPhoto = allObjects.filter(obj =>
      obj.type === 'APPEARED_IN' &&
      obj.photoId === photoId &&
      obj.personId !== personId
    ) as Appearance[];

    for (const other of othersInPhoto) {
      if (other.personId) otherPeopleIds.add(other.personId);
    }
  }

  for (const otherId of otherPeopleIds) {
    const existingKnows = allObjects.find(obj =>
      obj.type === 'KNOWS' &&
      ((obj.personA === personId && obj.personB === otherId) ||
        (obj.personA === otherId && obj.personB === personId))
    ) as Knows | undefined;

    const weight = calculateWeight(personId, otherId, allObjects);

    if (existingKnows) {
      await space.updateObject(existingKnows.id, {
        data: {
          weight,
          updated_at: Date.now()
        }
      });
    } else {
      await space.createObject({
        data: {
          type: 'KNOWS',
          personA: personId,
          personB: otherId,
          weight,
          created_at: Date.now(),
          updated_at: Date.now()
        }
      });
    }
  }
}

function calculateWeight(idA: string, idB: string, allObjects: RoolObject[]): number {
  const photosA = new Set(allObjects.filter(obj => obj.type === 'APPEARED_IN' && obj.personId === idA).map(a => (a as Appearance).photoId));
  const photosB = new Set(allObjects.filter(obj => obj.type === 'APPEARED_IN' && obj.personId === idB).map(a => (a as Appearance).photoId));

  let intersection = 0;
  for (const photoId of photosA) {
    if (photosB.has(photoId)) intersection++;
  }
  return intersection;
}

function mockDetectFaces(fileDataUri: string) {
  const count = Math.floor(Math.random() * 2) + 1; // 1-2 faces for seed/demo
  const faces = [];
  for (let i = 0; i < count; i++) {
    faces.push({
      boundingBox: {
        x: 0.1 + Math.random() * 0.7,
        y: 0.1 + Math.random() * 0.7,
        width: 0.1 + Math.random() * 0.1,
        height: 0.1 + Math.random() * 0.1
      }
    });
  }
  return faces;
}
