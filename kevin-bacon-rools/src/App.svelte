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
  import { seedGraph } from "./lib/seed";
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
  let isSeeding = $state(false);

  $effect(() => {
    if (rool.authenticated && rool.spaces && !space) {
      openSpace();
    }
  });

  const SPACE_ID = "xo6xP8";

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

    if (!isSeeding) {
      isSeeding = true;
      await seedGraph(space);
      isSeeding = false;
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
1. When asked to identify people in a photo, search the web to find out who they are.
2. For each person identified, check if a Person object with that name already exists (use findObjects with where: { type: "Person", name: "<name>" }).
3. If the person exists, reuse their ID. If not, create a new Person object.
4. Create APPEARED_IN relationships linking each person to the photo.
5. For every pair of people in the same photo, create a KNOWS relationship if one doesn't already exist, or increment the weight if it does.
6. Always respond with a brief summary of who you found and what relationships you created.`);

      // 4. Use LLM to identify people in the photo
      await space.prompt(
        `Look at this image and identify all the people in it: ${imageUrl}

Search the web to determine who these people are. Then for each person:
1. Check if a Person with that name already exists in the space
2. If not, create a new Person object with their name
3. Create APPEARED_IN relationships to the Photo object that has file_reference "${imageUrl}"
4. For every pair of people you identify in this photo, create or update a KNOWS relationship between them

Return a brief summary of who you found.`,
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
  class="min-h-dvh bg-gray-950 text-gray-200 font-sans selection:bg-blue-500/30"
>
  {#if rool.authenticated === undefined}
    <div
      class="fixed inset-0 flex items-center justify-center bg-gray-950 z-50"
    >
      <div class="animate-pulse flex flex-col items-center gap-4">
        <div class="w-16 h-16 rounded-full bg-blue-600/50 blur-xl"></div>
        <p class="text-blue-400 font-medium tracking-widest uppercase text-xs">
          Initializing Rool
        </p>
      </div>
    </div>
  {:else if rool.authenticated === false}
    <Splash appName={APP_NAME} onLogin={() => rool.login(APP_NAME)} />
  {:else}
    <div class="flex flex-col h-screen overflow-hidden">
      <header
        class="h-16 shrink-0 border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl flex items-center justify-between px-8 z-40"
      >
        <div class="flex items-center gap-3">
          <img
            src="/kevin-bacon.png"
            alt="Kevin Bacon"
            class="w-9 h-9 rounded-full object-cover shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/40"
          />
          <h1
            class="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400"
          >
            Kevin Bacon Rools
          </h1>
        </div>
        <div class="flex items-center gap-4">
          <button
            onclick={() => rool.logout()}
            class="text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
          >
            Logout
          </button>
        </div>
      </header>

      <main
        class="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar"
      >
        {#if !space}
          <div class="flex flex-col items-center justify-center h-64 gap-4">
            <div
              class="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"
            ></div>
            <p class="text-gray-500 text-sm italic">
              Accessing shared Rool space...
            </p>
          </div>
        {:else}
          <div class="max-w-6xl mx-auto space-y-8">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div class="lg:col-span-9">
                <div class="relative group">
                  <div
                    class="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"
                  ></div>
                  <GraphCanvas
                    persons={graphManager.persons.filter((p) => p.name)}
                    connections={graphManager.connections}
                  />
                </div>
              </div>

              <div class="lg:col-span-3 space-y-6">
                <div
                  class="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl shadow-xl space-y-4"
                >
                  <h3
                    class="text-xs font-black text-gray-500 uppercase tracking-widest"
                  >
                    Build Graph
                  </h3>
                  <UploadPanel
                    onUpload={handleUpload}
                    {isProcessing}
                    errorMessage={uploadError}
                  />
                </div>
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

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #1f2937;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #374151;
  }
</style>
