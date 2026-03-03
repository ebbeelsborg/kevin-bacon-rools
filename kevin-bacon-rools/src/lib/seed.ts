import type { ReactiveSpace } from '@rool-dev/svelte';

export async function seedGraph(space: ReactiveSpace) {
  // Check if Kevin Bacon already exists to avoid duplicates
  const objects = (space.collection({}).objects as any[]);
  const exists = objects.some(o => o.type === 'Person' && o.name === 'Kevin Bacon');

  if (exists) return;

  console.log('Seeding Kevin Bacon...');
  await space.createObject({
    data: {
      type: 'Person',
      name: 'Kevin Bacon',
      created_at: Date.now()
    }
  });
}
