#!/usr/bin/env node
/**
 * Fix photos that have no people identified.
 * Re-prompts the AI to analyze the image and populate the Photo's people field.
 *
 * Use: node fix_unidentified_photos.js
 */
import { RoolClient } from '@rool-dev/sdk';
import { NodeAuthProvider } from '@rool-dev/sdk/node';

const SPACE_ID = 'EBYTmQ';

async function run() {
  const rool = new RoolClient({ authProvider: new NodeAuthProvider() });
  await rool.initialize();
  const space = await rool.openSpace(SPACE_ID);
  const data = space.getData();

  const photos = Object.values(data.objects)
    .map((e) => e.data)
    .filter((o) => o.type?.toLowerCase() === 'photo');

  const unidentified = photos.filter((ph) => !Array.isArray(ph.people) || ph.people.length === 0);

  if (unidentified.length === 0) {
    console.log('No unidentified photos. All good!');
    space.close();
    process.exit(0);
    return;
  }

  console.log(`Found ${unidentified.length} photo(s) with no people identified.\n`);

  await space.setSystemInstruction(`You are a graph-building assistant for the "Kevin Bacon Rools" app.

The space contains objects with these types:
- Person: { type: "Person", name: string, links: string[], created_at: number }
- Photo: { type: "Photo", file_reference: string, people: string[], upload_timestamp: number }

CRITICAL RULES — follow exactly:
1. ONLY create or reference Person objects for people who are PHYSICALLY VISIBLE in the photo.
2. Deduplication: if a Person with the same name already exists, reuse their existing ID. Never create duplicates.
3. Creation: if a visible person doesn't exist, create a new Person object.
4. Photo update: set the Photo object's "people" field to a JSON array of ALL visible persons' IDs.
5. Link merging (CRITICAL): For EVERY person visible in the photo:
   a. Add to their "links" array the IDs of all OTHER people visible in this photo (merge, don't replace).
   b. For every OTHER person already in the space who is ALSO visible, update THEIR "links" to include this person's ID (bidirectional).
6. All arrays MUST be proper JSON arrays: ["id1", "id2"]. NEVER comma-separated strings.
7. DO NOT create any object type other than Person or Photo.
8. Summary: brief list of names found.`);

  for (const photo of unidentified) {
    const imageUrl = photo.file_reference;
    if (!imageUrl) {
      console.log(`  Skipping ${photo.id}: no file_reference`);
      continue;
    }

    console.log(`  Processing photo ${photo.id} (${imageUrl.substring(0, 50)}...)`);

    // Fetch image and pass as attachment so the AI can actually see it
    let attachment = null;
    try {
      const response = await space.fetchMedia(imageUrl);
      attachment = await response.blob();
    } catch (e) {
      console.log(`  Warning: could not fetch image, trying with URL in prompt: ${e.message}`);
    }

    const promptText = `Analyze the attached photo and identify the people who are PHYSICALLY VISIBLE in it.

The Photo object with id "${photo.id}" needs its "people" field updated.

STRICT RULES:
- Only create Person objects for faces you can literally see in this image.
- Do NOT add people based on association, family connections, or world knowledge.
- If only one person is visible, set their links to [].

FORMAT RULES (critical):
- "links" and "people" MUST be proper JSON arrays: ["abc123", "def456"]
- WRONG: ["abc123,def456"] or "abc123,def456"

Steps:
1. Identify all VISIBLE people. For each: check if they exist by name, reuse existing ID or create new Person.
2. Update the Photo object "${photo.id}" - set its "people" field to a JSON array of all their IDs.
3. For EVERY visible person, MERGE the other visible people's IDs into their "links" array.
   - EXISTING people: also add the new/other visible people to THEIR "links" too (bidirectional).
4. Only use Person and Photo object types.

Return a brief list of who you can see in the photo.`;

    const opts = { objectIds: [photo.id], ephemeral: false };
    if (attachment) opts.attachments = [attachment];

    const { message, objects } = await space.prompt(promptText, opts);

    console.log(`  AI: ${message}`);
    console.log(`  Modified ${objects?.length ?? 0} objects\n`);
  }

  console.log('Done. Run dump_rool_state.js to verify.');
  space.close();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
