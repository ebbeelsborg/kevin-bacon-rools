import type { ReactiveSpace } from '@rool-dev/svelte';

export async function seedGraph(space: ReactiveSpace) {
  const objects = (space.collection({}).objects as any[]);
  if (objects.some(o => o.type === 'Person')) return;

  const { object: bacon } = await space.createObject({ data: { type: 'Person', name: 'Kevin Bacon', created_at: Date.now() } });
  const { object: tom } = await space.createObject({ data: { type: 'Person', name: 'Tom Hanks', created_at: Date.now() } });
  const { object: bill } = await space.createObject({ data: { type: 'Person', name: 'Bill Murray', created_at: Date.now() } });
  const { object: scarlett } = await space.createObject({ data: { type: 'Person', name: 'Scarlett Johansson', created_at: Date.now() } });
  const { object: ryan } = await space.createObject({ data: { type: 'Person', name: 'Ryan Reynolds', created_at: Date.now() } });

  const p1 = await space.createObject({ data: { type: 'Photo', upload_timestamp: Date.now(), file_reference: 'seed1' } });
  await space.createObject({ data: { type: 'APPEARED_IN', personId: bacon.id, photoId: p1.object.id, boundingBox: { x: 0.2, y: 0.2, width: 0.1, height: 0.1 } } });
  await space.createObject({ data: { type: 'APPEARED_IN', personId: tom.id, photoId: p1.object.id, boundingBox: { x: 0.5, y: 0.2, width: 0.1, height: 0.1 } } });

  const p2 = await space.createObject({ data: { type: 'Photo', upload_timestamp: Date.now(), file_reference: 'seed2' } });
  await space.createObject({ data: { type: 'APPEARED_IN', personId: tom.id, photoId: p2.object.id, boundingBox: { x: 0.2, y: 0.2, width: 0.1, height: 0.1 } } });
  await space.createObject({ data: { type: 'APPEARED_IN', personId: bill.id, photoId: p2.object.id, boundingBox: { x: 0.5, y: 0.2, width: 0.1, height: 0.1 } } });

  const p3 = await space.createObject({ data: { type: 'Photo', upload_timestamp: Date.now(), file_reference: 'seed3' } });
  await space.createObject({ data: { type: 'APPEARED_IN', personId: bill.id, photoId: p3.object.id, boundingBox: { x: 0.2, y: 0.2, width: 0.1, height: 0.1 } } });
  await space.createObject({ data: { type: 'APPEARED_IN', personId: scarlett.id, photoId: p3.object.id, boundingBox: { x: 0.5, y: 0.2, width: 0.1, height: 0.1 } } });

  const p4 = await space.createObject({ data: { type: 'Photo', upload_timestamp: Date.now(), file_reference: 'seed4' } });
  await space.createObject({ data: { type: 'APPEARED_IN', personId: scarlett.id, photoId: p4.object.id, boundingBox: { x: 0.2, y: 0.2, width: 0.1, height: 0.1 } } });
  await space.createObject({ data: { type: 'APPEARED_IN', personId: ryan.id, photoId: p4.object.id, boundingBox: { x: 0.5, y: 0.2, width: 0.1, height: 0.1 } } });

  await space.createObject({ data: { type: 'KNOWS', personA: bacon.id, personB: tom.id, weight: 1, created_at: Date.now(), updated_at: Date.now() } });
  await space.createObject({ data: { type: 'KNOWS', personA: tom.id, personB: bill.id, weight: 1, created_at: Date.now(), updated_at: Date.now() } });
  await space.createObject({ data: { type: 'KNOWS', personA: bill.id, personB: scarlett.id, weight: 1, created_at: Date.now(), updated_at: Date.now() } });
  await space.createObject({ data: { type: 'KNOWS', personA: scarlett.id, personB: ryan.id, weight: 1, created_at: Date.now(), updated_at: Date.now() } });
}
