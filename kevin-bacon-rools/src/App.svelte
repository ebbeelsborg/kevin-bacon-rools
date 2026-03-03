<script lang="ts">
  import {
    createRool,
    type ReactiveSpace,
    type ReactiveCollection,
  } from "@rool-dev/svelte";
  import Splash from "./Splash.svelte";
  import UploadPanel from "./lib/components/UploadPanel.svelte";
  import GraphCanvas from "./lib/components/GraphCanvas.svelte";
  import { GraphManager } from "./lib/graph";
  import type { RoolObject } from "./lib/types";

  const APP_NAME = "Kevin Bacon Rools";

  const rool = createRool();
  rool.init();

  let space = $state<ReactiveSpace | null>(null);
  let collection = $state<ReactiveCollection | null>(null);
  let objects = $derived((collection?.objects as RoolObject[]) ?? []);

  let graphManager = $derived(new GraphManager(objects));

  let isProcessing = $state(false);
  let uploadError = $state("");

  $effect(() => {
    if (rool.authenticated && rool.spaces && !space) {
      openSpace();
    }
  });

  const SPACE_ID = "EBYTmQ";

  async function openSpace() {
    space = await rool.openSpace(SPACE_ID, { conversationId: "main" });
    collection = space.collection({});

    // Ensure it's shared with editor access for everyone
    try {
      if (space.role === "owner" || space.role === "admin") {
        await space.setLinkAccess("editor");
      }
    } catch (e) {
      console.warn("Could not set link access:", e);
    }
  }

  const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];

  async function handleUpload(file: File) {
    if (!space) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      uploadError = `Only PNG and JPG files are supported. You dropped a ${file.type || "unknown"} file.`;
      return;
    }

    uploadError = "";
    isProcessing = true;

    try {
      // 1. Upload image as media to the space
      const imageUrl = await space.uploadMedia(file);

      // 2. Create Photo node
      await space.createObject({
        data: {
          type: "Photo",
          file_reference: imageUrl,
          upload_timestamp: Date.now(),
        },
      });

      // 3. Set system instruction for graph-building behavior
      await space.setSystemInstruction(`You are a graph-building assistant for the "Kevin Bacon Rools" app.

The space contains objects with these types:
- Person: { type: "Person", name: string, links: string[], created_at: number }
- Photo: { type: "Photo", file_reference: string, people: string[], upload_timestamp: number }

CRITICAL RULES — follow exactly:
1. ONLY create or reference Person objects for people who are PHYSICALLY VISIBLE in the photo.
2. Deduplication: if a Person with the same name already exists, reuse their existing ID. Never create duplicates.
3. Creation: if a visible person doesn't exist, create a new Person object.
4. Photo update: set the Photo object's "people" field to a JSON array of ALL visible persons' IDs.
5. BIDIRECTIONAL LINKS (MANDATORY — do not skip): For EVERY person visible in the photo:
   a. Add to their "links" array the IDs of all OTHER people visible in this photo (merge, don't replace).
   b. For EVERY OTHER person visible in this photo, you MUST also update THEIR "links" to include this person's ID. Every co-visible pair must link to each other. If A is in the photo with B, then A.links must include B AND B.links must include A. No exceptions.
6. All arrays MUST be proper JSON arrays: ["id1", "id2"]. NEVER comma-separated strings.
7. DO NOT create any object type other than Person or Photo.
8. Summary: brief list of names found.`);

      // 4. Use LLM to identify people in the photo
      await space.prompt(
        `Analyze this photo and identify the people who are PHYSICALLY VISIBLE in it: ${imageUrl}

STRICT RULES:
- Only create Person objects for faces you can literally see in this image.
- Do NOT add people based on association, family connections, or world knowledge.
- If only one person is visible, set their links to [].

FORMAT RULES (critical):
- "links" and "people" MUST be proper JSON arrays: ["abc123", "def456"]
- WRONG: ["abc123,def456"] or "abc123,def456"

Steps:
1. Identify all VISIBLE people. For each: check if they exist by name, reuse existing ID or create new Person.
2. Set this Photo object's "people" to a JSON array of all their IDs.
3. BIDIRECTIONAL LINKS (required): For EVERY visible person, MERGE the other visible people's IDs into their "links". Then for EVERY OTHER visible person, update THEIR "links" to include this person's ID. All co-visible pairs must link to each other — no exceptions.
4. Only use Person and Photo object types.

Return a brief list of who you can see in the photo.`,
        { ephemeral: false },
      );
    } catch (e) {
      console.error("Upload failed:", e);
      uploadError =
        "Something went wrong processing the image. Please try again.";
    } finally {
      isProcessing = false;
    }
  }
</script>

<div
  class="min-h-dvh bg-slate-50 text-slate-900 font-sans selection:bg-blue-500/10"
>
  {#if rool.authenticated === undefined}
    <div
      class="fixed inset-0 flex items-center justify-center bg-slate-50 z-50"
    >
      <div class="animate-pulse flex flex-col items-center gap-4">
        <div class="w-16 h-16 rounded-full bg-blue-600/10 blur-xl"></div>
        <p class="text-blue-600 font-bold tracking-widest uppercase text-xs">
          Initializing Rool
        </p>
      </div>
    </div>
  {:else if rool.authenticated === false}
    <Splash appName={APP_NAME} onLogin={() => rool.login(APP_NAME)} />
  {:else}
    <div class="flex flex-col h-screen overflow-hidden">
      <header
        class="h-16 shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur-xl flex items-center justify-between px-8 z-40 shadow-sm"
      >
        <div class="flex items-center gap-3">
          <img
            src="/kevin-bacon.png"
            alt="Kevin Bacon"
            class="w-9 h-9 rounded-full object-cover shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/40"
          />
          <h1 class="text-lg font-black text-slate-900">Kevin Bacon Rools</h1>
        </div>
        <div class="flex items-center gap-4">
          <button
            onclick={() => rool.logout()}
            class="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest"
          >
            Logout
          </button>
        </div>
      </header>

      <main class="flex-1 overflow-hidden p-6 flex gap-6">
        {#if !space}
          <div class="flex-1 flex flex-col items-center justify-center gap-4">
            <div
              class="w-12 h-12 border-4 border-blue-500/10 border-t-blue-600 rounded-full animate-spin"
            ></div>
            <p class="text-slate-400 text-sm font-medium italic">
              Accessing shared Rool space...
            </p>
          </div>
        {:else}
          <!-- Left: Maximized Graph Area with Border -->
          <div
            class="flex-1 border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm relative group"
          >
            <GraphCanvas
              persons={graphManager.persons.filter((p) => p.name)}
              connections={graphManager.connections}
            />
          </div>

          <!-- Right: Sidebar for Upload -->
          <div class="w-80 shrink-0 flex flex-col gap-6">
            <div
              class="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4"
            >
              <div class="flex items-center justify-between">
                <h3
                  class="text-[10px] font-black text-slate-400 uppercase tracking-widest"
                >
                  Build Graph
                </h3>
                {#if isProcessing}
                  <div
                    class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"
                  ></div>
                {/if}
              </div>
              <UploadPanel
                onUpload={handleUpload}
                {isProcessing}
                errorMessage={uploadError}
              />
            </div>
            <p
              class="px-2 text-[10px] leading-relaxed text-slate-400 font-medium"
            >
              Upload a photo to detect people and build connections in the
              collaborative supergraph.
            </p>

            <!-- Wikipedia Link -->
            <div class="px-2 pt-4 border-t border-slate-100">
              <a
                href="https://en.wikipedia.org/wiki/Six_Degrees_of_Kevin_Bacon"
                target="_blank"
                rel="noopener noreferrer"
                class="group flex items-center gap-2 text-[11px] text-blue-600 font-bold hover:text-blue-700 transition-colors"
              >
                <span>Six Degrees of Kevin Bacon</span>
                <svg
                  class="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        {/if}
      </main>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
  }
</style>
