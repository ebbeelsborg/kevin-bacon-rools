import { RoolClient } from '@rool-dev/sdk';
import { NodeAuthProvider } from '@rool-dev/sdk/node';

const AVENGERS_CAST = [
  'Benedict Cumberbatch', 'Chadwick Boseman', 'Chris Pratt',
  'Josh Brolin', 'Benedict Wong', 'Danai Gurira',
  'Sebastian Stan', 'Bradley Cooper', 'Letitia Wright',
  'Chris Hemsworth', 'Winston Duke', 'Zoe Saldana',
];

const IRON_MAN_NAMES = ['Robert Downey Jr.', 'Scarlett Johansson', 'Gwyneth Paltrow', 'Don Cheadle', 'Jon Favreau', 'Mickey Rourke'];

async function run() {
  const rool = new RoolClient({ authProvider: new NodeAuthProvider() });
  await rool.initialize();
  const space = await rool.openSpace('EBYTmQ');
  const data = space.getData();
  const existing = Object.values(data.objects).map(e => e.data);
  const persons = existing.filter(o => o.type === 'Person');

  // Get Iron Man IDs
  const ironManIds = persons.filter(p => IRON_MAN_NAMES.includes(p.name)).map(p => p.id);
  console.log(`Iron Man IDs (${ironManIds.length}): ${ironManIds.join(', ')}`);

  // Create Avengers cast
  const avengersIds = [];
  for (const name of AVENGERS_CAST) {
    const { object } = await space.createObject({
      data: { type: 'Person', name, links: [], created_at: Date.now() },
      ephemeral: true,
    });
    avengersIds.push(object.id);
    console.log(`Created: ${name} (${object.id})`);
  }

  // All MCU people = iron man + avengers, for mutual linking within Avengers photos
  const allMcuIds = [...ironManIds, ...avengersIds];

  // Update Avengers cast: link to all other Avengers + all Iron Man cast
  for (const id of avengersIds) {
    const others = allMcuIds.filter(x => x !== id);
    await space.updateObject(id, { data: { links: others }, ephemeral: true });
    console.log(`Linked Avengers person ${id} to ${others.length} others`);
  }

  // Update Iron Man cast: add all Avengers IDs to their existing links
  for (const p of persons) {
    if (!IRON_MAN_NAMES.includes(p.name)) continue;
    const current = Array.isArray(p.links) ? p.links : [];
    const merged = Array.from(new Set([...current, ...avengersIds]));
    await space.updateObject(p.id, { data: { links: merged }, ephemeral: true });
    console.log(`Updated ${p.name}: ${current.length} -> ${merged.length} links`);
  }

  // Update photos LAqXWZ and RvQ1Ik with the full MCU cast
  for (const photoId of ['LAqXWZ', 'RvQ1Ik']) {
    await space.updateObject(photoId, { data: { people: allMcuIds }, ephemeral: true });
    console.log(`Updated photo ${photoId} with ${allMcuIds.length} people`);
  }

  console.log(`\nDone! Space now has ${persons.length + avengersIds.length} persons.`);
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
