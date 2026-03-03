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
 
Rules:
1. Identification: Identify people in photos precisely.
2. Deduplication: Reuse existing Person IDs by name.
3. Creation: If a person doesn't exist, create a new Person object.
4. Associations (CRITICAL):
   - Update the Photo object's "people" array with the Person IDs.
   - For EACH person identified, update their "links" array to include all OTHER people found in the same photo.
   - You MUST use object IDs (e.g., qC81GS) in these arrays.
   - DO NOT create any other object types (no KNOWS, no APPEARED_IN).
5. Summary: Respond with a brief list of names found.`);

      // 4. Use LLM to identify people in the photo
      await space.prompt(
        `Look at this image and identify all the people in it: ${imageUrl}
 
1. For each person:
   - Check if they exist in the space by name.
   - If not, create a new Person object.
2. Update this Photo object (file_reference: "${imageUrl}") by adding their IDs to the "people" array.
3. For every person found in this photo, update their "links" array to include the IDs of all other people also present in this photo.
4. IMPORTANT: Only use Person and Photo types. NO "KNOWS" or "APPEARED_IN" objects.
 
Return a brief summary.`,
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
