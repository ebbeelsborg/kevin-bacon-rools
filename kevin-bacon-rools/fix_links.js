import { RoolClient } from '@rool-dev/sdk';
import { NodeAuthProvider } from '@rool-dev/sdk/node';

const IRON_MAN_CAST = ['Robert Downey Jr.', 'Scarlett Johansson', 'Gwyneth Paltrow', 'Don Cheadle', 'Jon Favreau', 'Mickey Rourke'];
const AVENGERS_CAST = ['Benedict Cumberbatch', 'Chadwick Boseman', 'Chris Pratt', 'Josh Brolin', 'Benedict Wong', 'Danai Gurira', 'Sebastian Stan', 'Bradley Cooper', 'Letitia Wright', 'Chris Hemsworth', 'Winston Duke', 'Zoe Saldana'];

async function fixLinks() {
  const rool = new RoolClient({ authProvider: new NodeAuthProvider() });
  await rool.initialize();
  const space = await rool.openSpace('EBYTmQ');
  const data = space.getData();
  const all = Object.values(data.objects).map(e => e.data);
  const persons = all.filter(o => o.type === 'Person');

  console.log(`Total persons: ${persons.length}`);
  persons.forEach(p => console.log(`  ${p.name} (${p.id}) links:${(p.links || []).length}`));

  // Find IDs for each group
  const ironManIds = [];
  const avengersIds = [];

  for (const p of persons) {
    if (IRON_MAN_CAST.includes(p.name)) ironManIds.push(p.id);
    if (AVENGERS_CAST.includes(p.name)) avengersIds.push(p.id);
  }

  console.log(`\nIron Man cast found: ${ironManIds.length}/${IRON_MAN_CAST.length}`);
  console.log(`Avengers cast found: ${avengersIds.length}/${AVENGERS_CAST.length}`);

  if (ironManIds.length === 0 || avengersIds.length === 0) {
    console.log('ERROR: one or both groups not found. Aborting.');
    process.exit(1);
  }

  // Cross-link: add Avengers IDs to Iron Man people's links (and vice versa)
  for (const person of persons) {
    const isIronMan = IRON_MAN_CAST.includes(person.name);
    const isAvengers = AVENGERS_CAST.includes(person.name);
    if (!isIronMan && !isAvengers) continue;

    const currentLinks = Array.isArray(person.links) ? person.links : [];
    const toAdd = isIronMan ? avengersIds : ironManIds;
    const newLinks = Array.from(new Set([...currentLinks, ...toAdd])).filter(id => id !== person.id);

    if (newLinks.length !== currentLinks.length) {
      console.log(`Updating ${person.name}: ${currentLinks.length} -> ${newLinks.length} links`);
      await space.updateObject(person.id, { data: { links: newLinks }, ephemeral: true });
    } else {
      console.log(`${person.name}: already has all links (${currentLinks.length})`);
    }
  }

  console.log('\nDone.');
  process.exit(0);
}

fixLinks().catch(e => { console.error(e.message); process.exit(1); });
