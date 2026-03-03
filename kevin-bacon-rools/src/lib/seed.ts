import type { ReactiveSpace } from '@rool-dev/svelte';

export async function seedGraph(space: ReactiveSpace) {
  const collection = space.collection({});
  const objects = (collection.objects as any[]);

  // Find Kevin Bacon
  const kevinBacon = objects.find(o => o.type === 'Person' && o.name === 'Kevin Bacon');

  // Delete EVERYTHING else
  const toDelete = objects.filter(o => o.id !== kevinBacon?.id);

  if (toDelete.length > 0) {
    console.log(`Pruning ${toDelete.length} objects from space...`);
    await space.deleteObjects(toDelete.map(o => o.id));
  }

  if (!kevinBacon) {
    console.log('Seeding Kevin Bacon...');
    await space.createObject({
      data: {
        type: 'Person',
        name: 'Kevin Bacon',
        created_at: Date.now()
      }
    });
  }
}
