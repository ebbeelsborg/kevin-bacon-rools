#!/usr/bin/env node
/**
 * Fix asymmetric Person.links: add Mickey Rourke and Jon Favreau to the
 * links of Scarlett Johansson, Robert Downey Jr., Gwyneth Paltrow, Don Cheadle.
 */
import { RoolClient } from '@rool-dev/sdk';
import { NodeAuthProvider } from '@rool-dev/sdk/node';

const SPACE_ID = 'EBYTmQ';

// People who need CeTRik (Mickey) and IMGC8T (Jon) added to their links
const TO_UPDATE = ['ljXwv8', 'OE3XTh', 'p9TzsH', 'E5sgK3']; // Scarlett, RDJ, Gwyneth, Don
const TO_ADD = ['CeTRik', 'IMGC8T']; // Mickey Rourke, Jon Favreau

async function run() {
  const rool = new RoolClient({ authProvider: new NodeAuthProvider() });
  await rool.initialize();
  const space = await rool.openSpace(SPACE_ID);
  const data = space.getData();

  const persons = Object.values(data.objects)
    .map((e) => e.data)
    .filter((o) => o.type?.toLowerCase() === 'person');

  const idToName = Object.fromEntries(persons.map((p) => [p.id, p.name]));

  for (const id of TO_UPDATE) {
    const p = persons.find((x) => x.id === id);
    if (!p) {
      console.log(`Skip ${id}: not found`);
      continue;
    }
    const current = Array.isArray(p.links) ? [...p.links] : [];
    const missing = TO_ADD.filter((x) => !current.includes(x));
    if (missing.length === 0) {
      console.log(`${idToName[id]}: already has all links`);
      continue;
    }
    const merged = Array.from(new Set([...current, ...TO_ADD]));
    await space.updateObject(id, { data: { links: merged }, ephemeral: true });
    console.log(`${idToName[id]}: added ${missing.map((x) => idToName[x]).join(', ')}`);
  }

  console.log('\nDone.');
  space.close();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
