#!/usr/bin/env node
/**
 * Dump the full rool space state for Kevin Bacon Rools (EBYTmQ).
 * Use: node dump_rool_state.js
 */
import { RoolClient } from '@rool-dev/sdk';
import { NodeAuthProvider } from '@rool-dev/sdk/node';

const SPACE_ID = 'EBYTmQ';

async function run() {
  const rool = new RoolClient({ authProvider: new NodeAuthProvider() });
  await rool.initialize();
  const space = await rool.openSpace(SPACE_ID);
  const data = space.getData();

  const objects = Object.values(data.objects).map((e) => ({ ...e.data, modifiedAt: e.modifiedAt }));

  const persons = objects.filter((o) => o.type?.toLowerCase() === 'person');
  const photos = objects.filter((o) => o.type?.toLowerCase() === 'photo');
  const other = objects.filter((o) => !persons.includes(o) && !photos.includes(o));

  console.log('=== ROOL SPACE STATE (EBYTmQ - Kevin Bacon Rools) ===\n');

  console.log('--- PERSONS ---');
  for (const p of persons) {
    const links = Array.isArray(p.links) ? p.links : [];
    const linkCount = links.length;
    const hasName = !!p.name;
    const status = !hasName ? '⚠️  NO NAME' : linkCount === 0 ? '⚠️  NO LINKS (isolated)' : '✓';
    console.log(`  ${p.id} | ${(p.name || '(unnamed)').padEnd(25)} | links: ${linkCount} ${status}`);
  }

  console.log('\n--- PHOTOS ---');
  for (const ph of photos) {
    const people = Array.isArray(ph.people) ? ph.people : [];
    const peopleCount = people.length;
    const status = peopleCount === 0 ? '⚠️  NO PEOPLE (unidentified)' : '✓';
    console.log(`  ${ph.id} | people: ${peopleCount} ${status}`);
    if (ph.file_reference) {
      console.log(`       file: ${ph.file_reference.substring(0, 80)}...`);
    }
    if (peopleCount > 0) {
      const names = people
        .map((id) => {
          const p = persons.find((x) => x.id === id);
          return p?.name || id;
        })
        .join(', ');
      console.log(`       → ${names}`);
    }
  }

  if (other.length > 0) {
    console.log('\n--- OTHER OBJECTS ---');
    for (const o of other) {
      console.log(`  ${o.id} | type: ${o.type || 'unknown'}`, JSON.stringify(o));
    }
  }

  // Summary: photos with missing people
  const photosWithNoPeople = photos.filter((ph) => !Array.isArray(ph.people) || ph.people.length === 0);
  const personsWithNoLinks = persons.filter((p) => !Array.isArray(p.links) || p.links.length === 0);
  const personsWithNoName = persons.filter((p) => !p.name);

  console.log('\n=== SUMMARY ===');
  console.log(`Total persons: ${persons.length}`);
  console.log(`Total photos: ${photos.length}`);
  if (photosWithNoPeople.length > 0) {
    console.log(`\n⚠️  Photos with NO people identified: ${photosWithNoPeople.length}`);
    photosWithNoPeople.forEach((ph) => console.log(`   - ${ph.id}`));
  }
  if (personsWithNoLinks.length > 0) {
    console.log(`\n⚠️  Persons with NO links (isolated): ${personsWithNoLinks.length}`);
    personsWithNoLinks.forEach((p) => console.log(`   - ${p.id} (${p.name || 'unnamed'})`));
  }
  if (personsWithNoName.length > 0) {
    console.log(`\n⚠️  Persons with NO name: ${personsWithNoName.length}`);
    personsWithNoName.forEach((p) => console.log(`   - ${p.id}`));
  }

  space.close();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
