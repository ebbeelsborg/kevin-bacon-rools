#!/usr/bin/env node
/**
 * Re-analyze a specific photo to identify ALL people visible.
 * Use: node reidentify_photo.js <photoId>
 * Example: node reidentify_photo.js 534tMY
 */
import { RoolClient } from '@rool-dev/sdk';
import { NodeAuthProvider } from '@rool-dev/sdk/node';

const SPACE_ID = 'EBYTmQ';
const PHOTO_ID = process.argv[2] || '534tMY';

async function run() {
  const rool = new RoolClient({ authProvider: new NodeAuthProvider() });
  await rool.initialize();
  const space = await rool.openSpace(SPACE_ID);
  const data = space.getData();

  const photo = Object.values(data.objects)
    .map((e) => e.data)
    .find((o) => o.id === PHOTO_ID);

  if (!photo || photo.type?.toLowerCase() !== 'photo') {
    console.error(`Photo ${PHOTO_ID} not found.`);
    process.exit(1);
  }

  const imageUrl = photo.file_reference;
  if (!imageUrl) {
    console.error(`Photo ${PHOTO_ID} has no file_reference.`);
    process.exit(1);
  }

  const currentPeople = Array.isArray(photo.people) ? photo.people : [];
  console.log(`Re-analyzing photo ${PHOTO_ID}. Current: ${currentPeople.length} people.`);
  console.log(`Image: ${imageUrl}\n`);

  await space.setSystemInstruction(`You are a graph-building assistant for the "Kevin Bacon Rools" app.

The space contains objects with these types:
- Person: { type: "Person", name: string, links: string[], created_at: number }
- Photo: { type: "Photo", file_reference: string, people: string[], upload_timestamp: number }

CRITICAL RULES — follow exactly:
1. ONLY create or reference Person objects for people who are PHYSICALLY VISIBLE in the photo.
2. Deduplication: if a Person with the same name already exists, reuse their existing ID. Never create duplicates.
3. Creation: if a visible person doesn't exist, create a new Person object.
4. Photo update: set the Photo object's "people" field to a JSON array of ALL visible persons' IDs.
5. BIDIRECTIONAL LINKS (MANDATORY): For EVERY person visible in the photo, add all other visible people to their "links", and ensure every other person's "links" includes them. All co-visible pairs must link to each other.
6. All arrays MUST be proper JSON arrays: ["id1", "id2"]. NEVER comma-separated strings.
7. DO NOT create any object type other than Person or Photo.
8. Summary: brief list of names found.`);

  let attachment = null;
  try {
    const response = await space.fetchMedia(imageUrl);
    attachment = await response.blob();
  } catch (e) {
    console.error(`Could not fetch image: ${e.message}`);
    process.exit(1);
  }

  const promptText = `Analyze the attached photo with EXTREME care. Scan the ENTIRE image — foreground, background, edges, corners. Identify EVERY person whose face is visible, even partially.

The user reports that the current identification (6 people) is INCOMPLETE. There are more people in this photo. Look for:
- People in the back row
- People at the sides
- Anyone partially visible
- Group photos often have 8-12+ people

Update the Photo object "${PHOTO_ID}" with the COMPLETE list of ALL visible people's IDs. Do not stop at 6 — keep looking until you have identified every face.

For EVERY person visible, ensure:
1. They exist as a Person (create if new, reuse ID if exists).
2. Their "links" includes ALL other visible people.
3. Every other visible person's "links" includes them (bidirectional).

Return a complete numbered list of everyone you can see.`;

  const opts = {
    objectIds: [PHOTO_ID],
    ephemeral: false,
    attachments: [attachment],
    effort: 'REASONING',
  };

  const { message, objects } = await space.prompt(promptText, opts);

  console.log(`AI response:\n${message}`);
  console.log(`\nModified ${objects?.length ?? 0} objects.`);

  space.close();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
