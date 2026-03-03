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
- Person: { type: "Person", name: string, created_at: number }
- Photo: { type: "Photo", file_reference: string, upload_timestamp: number }
- APPEARED_IN: { type: "APPEARED_IN", personId: string, photoId: string }
- KNOWS: { type: "KNOWS", personA: string, personB: string, weight: number, created_at: number, updated_at: number }

Rules:
1. Identification: When asked to identify people in a photo, search the web to find out exactly who they are. Be precise.
2. Deduplication: For each person identified, check if a Person object with that name already exists. Reuse their ID if they do.
3. Creation: If they don't exist, create a new Person object.
4. Associations: Create APPEARED_IN relationships linking each identified person to the photo.
5. RELATIONSHIP MAPPING (CRITICAL): For EVERY POSSIBLE PAIR of people identified in the photo, create a KNOWS relationship link between them. 
   - Example: If you find A, B, and C, you MUST create/update relationships: (A, B), (B, C), and (A, C).
   - If a relationship already exists, increment the weight.
6. Summary: Always respond with a brief list of found names and confirmation of the links created.`);

      // 4. Use LLM to identify people in the photo
      await space.prompt(
        `Look at this image and identify all the people in it: ${imageUrl}

Search the web to determine who these people are. Then for each person:
1. Check if a Person with that name already exists in the space.
2. If not, create a new Person object.
3. Link each person to this Photo (file_reference: "${imageUrl}").
4. IMPORTANT: Link EVERY PAIR of people found in this photo with a KNOWS relationship. No one should be left unlinked.

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

      <main class="flex-1 overflow-hidden relative">
        {#if !space}
          <div class="flex flex-col items-center justify-center h-full gap-4">
            <div
              class="w-12 h-12 border-4 border-blue-500/10 border-t-blue-600 rounded-full animate-spin"
            ></div>
            <p class="text-slate-400 text-sm font-medium italic">
              Accessing shared Rool space...
            </p>
          </div>
        {:else}
          <div class="w-full h-full relative">
            <!-- Full Page Graph -->
            <GraphCanvas
              persons={graphManager.persons.filter((p) => p.name)}
              connections={graphManager.connections}
            />

            <!-- Floating Upload Panel -->
            <div class="absolute top-6 right-6 w-80 z-50">
              <div
                class="bg-white/80 backdrop-blur-xl border border-slate-200 p-5 rounded-2xl shadow-2xl shadow-slate-200/50 space-y-4"
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
