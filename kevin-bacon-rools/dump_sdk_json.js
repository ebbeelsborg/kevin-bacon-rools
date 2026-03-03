#!/usr/bin/env node
/**
 * Dump rool space data via SDK as JSON (for comparison with CLI).
 * Outputs to stdout - redirect to file.
 */
import { RoolClient } from '@rool-dev/sdk';
import { NodeAuthProvider } from '@rool-dev/sdk/node';

const SPACE_ID = 'EBYTmQ';

async function run() {
  const rool = new RoolClient({ authProvider: new NodeAuthProvider() });
  await rool.initialize();
  const space = await rool.openSpace(SPACE_ID);
  const data = space.getData();

  const objects = Object.values(data.objects).map((e) => ({
    ...e.data,
    modifiedAt: e.modifiedAt,
  }));

  const persons = objects.filter((o) => o.type?.toLowerCase() === 'person');
  const photos = objects.filter((o) => o.type?.toLowerCase() === 'photo');

  const output = {
    source: 'sdk',
    method: 'space.getData()',
    timestamp: new Date().toISOString(),
    spaceId: SPACE_ID,
    counts: { persons: persons.length, photos: photos.length },
    persons: persons.map((p) => ({
      id: p.id,
      name: p.name,
      links: p.links,
      linksCount: Array.isArray(p.links) ? p.links.length : 0,
    })),
    photos: photos.map((ph) => ({
      id: ph.id,
      file_reference: ph.file_reference,
      people: ph.people,
      peopleCount: Array.isArray(ph.people) ? ph.people.length : 0,
    })),
  };

  console.log(JSON.stringify(output, null, 2));
  space.close();
  process.exit(0);
}

run().catch((e) => {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
});
