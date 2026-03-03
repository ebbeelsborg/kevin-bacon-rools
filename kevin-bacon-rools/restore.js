import { RoolClient } from '@rool-dev/sdk';
import { NodeAuthProvider } from '@rool-dev/sdk/node';

// The 12 MCU cast members from Lucas's upload(s).
// LAqXWZ and RvQ1Ik are the two photos with no people arrays.
const MCU_CAST = [
  'Benedict Cumberbatch',
  'Chadwick Boseman',
  'Chris Pratt',
  'Josh Brolin',
  'Benedict Wong',
  'Danai Gurira',
  'Sebastian Stan',
  'Bradley Cooper',
  'Letitia Wright',
  'Chris Hemsworth',
  'Winston Duke',
  'Zoe Saldana',
];

// Photos that had no people arrays - from Lucas's upload(s)
const PHOTO_IDS = ['LAqXWZ', 'RvQ1Ik'];

async function restore() {
  const rool = new RoolClient({ authProvider: new NodeAuthProvider() });
  await rool.initialize();
  const space = await rool.openSpace('EBYTmQ');

  // Create all 12 persons
  const createdIds: string[] = [];
  for (const name of MCU_CAST) {
    const { object } = await space.createObject({
      data: {
        type: 'Person',
        name,
        links: [],
        created_at: Date.now(),
      },
      ephemeral: true,
    });
    createdIds.push(object.id);
    console.log(`Created: ${name} (${object.id})`);
  }

  // Link them all to each other
  console.log('\nLinking all cast members to each other...');
  for (const id of createdIds) {
    const others = createdIds.filter(x => x !== id);
    await space.updateObject(id, { data: { links: others }, ephemeral: true });
  }

  // Update both photos to include all cast members in their people array
  for (const photoId of PHOTO_IDS) {
    await space.updateObject(photoId, { data: { people: createdIds }, ephemeral: true });
    console.log(`Updated photo ${photoId} with ${createdIds.length} people`);
  }

  console.log('\nDone! Restored', createdIds.length, 'persons.');
  process.exit(0);
}

restore().catch(e => { console.error(e); process.exit(1); });
