#!/usr/bin/env node
/**
 * Verify graph consistency: Photo.people vs Person.links vs derived connections.
 * Also checks if Person.links are bidirectional where expected.
 */
import { RoolClient } from '@rool-dev/sdk';
import { NodeAuthProvider } from '@rool-dev/sdk/node';

const SPACE_ID = 'EBYTmQ';

function parsePeopleArray(val) {
  if (!val || !Array.isArray(val)) return [];
  if (val.length === 1 && typeof val[0] === 'string' && val[0].includes(',')) {
    return val[0].split(',').map((s) => s.trim()).filter(Boolean);
  }
  return val.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean);
}

function deriveConnectionsFromPhotos(photos, persons) {
  const personIds = new Set(persons.map((p) => p.id));
  const links = new Set();
  for (const ph of photos) {
    const people = parsePeopleArray(ph.people);
    for (let i = 0; i < people.length; i++) {
      for (let j = i + 1; j < people.length; j++) {
        const a = people[i];
        const b = people[j];
        if (!personIds.has(a) || !personIds.has(b) || a === b) continue;
        links.add([a, b].sort().join('-'));
      }
    }
  }
  return links;
}

function deriveConnectionsFromPersonLinks(persons) {
  const personIds = new Set(persons.map((p) => p.id));
  const links = new Set();
  for (const p of persons) {
    const targets = parsePeopleArray(p.links);
    for (const t of targets) {
      if (!personIds.has(t) || t === p.id) continue;
      links.add([p.id, t].sort().join('-'));
    }
  }
  return links;
}

function checkBidirectional(persons) {
  const issues = [];
  for (const p of persons) {
    const targets = parsePeopleArray(p.links);
    for (const t of targets) {
      const other = persons.find((x) => x.id === t);
      if (!other) {
        issues.push(`Person ${p.name} (${p.id}) links to non-existent ID ${t}`);
        continue;
      }
      const otherLinks = parsePeopleArray(other.links);
      if (!otherLinks.includes(p.id)) {
        issues.push(
          `Asymmetric link: ${p.name} -> ${other.name}, but ${other.name}.links does not include ${p.id}`,
        );
      }
    }
  }
  return issues;
}

async function run() {
  const rool = new RoolClient({ authProvider: new NodeAuthProvider() });
  await rool.initialize();
  const space = await rool.openSpace(SPACE_ID);
  const data = space.getData();

  const objects = Object.values(data.objects).map((e) => e.data);
  const persons = objects.filter((o) => o.type?.toLowerCase() === 'person');
  const photos = objects.filter((o) => o.type?.toLowerCase() === 'photo');

  const idToName = Object.fromEntries(persons.map((p) => [p.id, p.name]));

  console.log('=== VERIFICATION REPORT ===\n');

  // 1. Connections from Photo.people
  const fromPhotos = deriveConnectionsFromPhotos(photos, persons);
  console.log('1. CONNECTIONS FROM PHOTO.PEOPLE');
  console.log(`   Total unique links: ${fromPhotos.size}`);
  const fromPhotosList = [...fromPhotos].map((k) => {
    const [a, b] = k.split('-');
    return `${idToName[a] || a}–${idToName[b] || b}`;
  });
  console.log('   ', fromPhotosList.join(', '));
  console.log('');

  // 2. Connections from Person.links
  const fromLinks = deriveConnectionsFromPersonLinks(persons);
  console.log('2. CONNECTIONS FROM PERSON.LINKS');
  console.log(`   Total unique links: ${fromLinks.size}`);
  const fromLinksList = [...fromLinks].map((k) => {
    const [a, b] = k.split('-');
    return `${idToName[a] || a}–${idToName[b] || b}`;
  });
  console.log('   ', fromLinksList.join(', '));
  console.log('');

  // 3. Symmetric difference
  const onlyInPhotos = [...fromPhotos].filter((x) => !fromLinks.has(x));
  const onlyInLinks = [...fromLinks].filter((x) => !fromPhotos.has(x));
  if (onlyInPhotos.length > 0) {
    console.log('3. LINKS IN PHOTO.PEOPLE BUT NOT IN PERSON.LINKS:');
    onlyInPhotos.forEach((k) => {
      const [a, b] = k.split('-');
      console.log(`   - ${idToName[a]}–${idToName[b]}`);
    });
    console.log('');
  }
  if (onlyInLinks.length > 0) {
    console.log('4. LINKS IN PERSON.LINKS BUT NOT IN PHOTO.PEOPLE:');
    onlyInLinks.forEach((k) => {
      const [a, b] = k.split('-');
      console.log(`   - ${idToName[a]}–${idToName[b]}`);
    });
    console.log('');
  }

  // 4. Bidirectional check
  const bidirIssues = checkBidirectional(persons);
  if (bidirIssues.length > 0) {
    console.log('5. BIDIRECTIONAL LINK ISSUES:');
    bidirIssues.forEach((m) => console.log(`   - ${m}`));
    console.log('');
  } else {
    console.log('5. BIDIRECTIONAL: All Person.links are properly bidirectional ✓');
    console.log('');
  }

  // 5. Photo-by-photo summary
  console.log('6. PHOTO IDENTIFICATION SUMMARY');
  for (const ph of photos) {
    const people = parsePeopleArray(ph.people);
    const names = people.map((id) => idToName[id] || id);
    console.log(`   ${ph.id}: ${people.length} person(s) → ${names.join(', ')}`);
  }

  space.close();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
