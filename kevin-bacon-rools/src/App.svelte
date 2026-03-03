<script lang="ts">
  import { createRool, type ReactiveSpace, type ReactiveCollection } from '@rool-dev/svelte';
  import Splash from './Splash.svelte';
  import Header from './Header.svelte';
  import UploadPanel from './lib/components/UploadPanel.svelte';
  import FaceTagger from './lib/components/FaceTagger.svelte';
  import GraphCanvas from './lib/components/GraphCanvas.svelte';
  import Leaderboard from './lib/components/Leaderboard.svelte';
  import MetricsPanel from './lib/components/MetricsPanel.svelte';
  import { GraphManager } from './lib/graph';
  import { ingestPhoto, tagPerson } from './lib/ingestion';
  import { seedGraph } from './lib/seed';
  import type { RoolObject, Person } from './lib/types';

  const APP_NAME = 'Kevin Bacon Rools';

  const rool = createRool();
  rool.init();

  let space = $state<ReactiveSpace | null>(null);
  let collection = $state<ReactiveCollection | null>(null);
  let objects = $derived(collection?.objects as RoolObject[] ?? []);
  
  let graphManager = $derived(new GraphManager(objects));
  
  let isUploading = $state(false);
  let lastUploadedPhoto = $state<{ uri: string, personIds: string[] } | null>(null);

  let searchSource = $state<string>('');
  let searchTarget = $state<string>('');
  let shortestPath = $state<string[] | null>(null);

  // Open shared space
  $effect(() => {
    if (rool.authenticated && rool.spaces && !space) {
      openSpace();
    }
  });

  async function openSpace() {
    // Try to find a space named exactly APP_NAME
    const existing = rool.spaces!.find(s => s.name === APP_NAME);
    space = existing
      ? await rool.openSpace(existing.id, { conversationId: 'main' })
      : await rool.createSpace(APP_NAME, { conversationId: 'main' });
    
    collection = space.collection({});
    
    // Ensure it's shared with editor access for everyone
    try {
      if (space.role === 'owner' || space.role === 'admin') {
        await space.setLinkAccess('editor');
      }
    } catch (e) {
      console.warn('Could not set link access (might not be owner):', e);
    }

    seedGraph(space);
  }

  async function handleUpload(fileData: string) {
    if (!space) return;
    isUploading = true;
    try {
      const { photo, personNodes } = await ingestPhoto(space, fileData);
      lastUploadedPhoto = { 
        uri: fileData, 
        personIds: personNodes.map(p => p.id) 
      };
    } finally {
      isUploading = false;
    }
  }

  async function handleTag(personId: string, name: string) {
    if (!space) return;
    await tagPerson(space, personId, name, objects);
  }

  function findPath() {
    if (!searchSource || !searchTarget) return;
    const result = graphManager.findShortestPath(searchSource, searchTarget);
    shortestPath = result?.path ?? null;
  }

  let topPersons = $derived(graphManager.persons
    .map(p => ({ ...p, connections: objects.filter(o => o.type === 'KNOWS' && (o.personA === p.id || o.personB === p.id)).length }))
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 5)
  );

  let currentAppearances = $derived(lastUploadedPhoto 
    ? objects.filter(o => o.type === 'APPEARED_IN' && lastUploadedPhoto!.personIds.includes(o.personId))
    : []
  );
</script>

<div class="min-h-dvh bg-gray-950 text-gray-200 font-sans selection:bg-blue-500/30">
  {#if rool.authenticated === undefined}
    <div class="fixed inset-0 flex items-center justify-center bg-gray-950 z-50">
      <div class="animate-pulse flex flex-col items-center gap-4">
        <div class="w-16 h-16 rounded-full bg-blue-600/50 blur-xl"></div>
        <p class="text-blue-400 font-medium tracking-widest uppercase text-xs">Initializing Rool</p>
      </div>
    </div>
  {:else if rool.authenticated === false}
    <Splash appName={APP_NAME} onLogin={() => rool.login(APP_NAME)} />
  {:else}
    <div class="flex flex-col h-screen overflow-hidden">
      <header class="h-16 shrink-0 border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl flex items-center justify-between px-8 z-40">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span class="font-black text-white text-xs">KB</span>
          </div>
          <h1 class="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Kevin Bacon Rools
          </h1>
        </div>
        <div class="flex items-center gap-4">
          <div class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live Supergraph</span>
          </div>
          <button 
            onclick={() => rool.logout()}
            class="text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
          >
            Logout
          </button>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
        {#if !space}
          <div class="flex flex-col items-center justify-center h-64 gap-4">
            <div class="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <p class="text-gray-500 text-sm italic">Accessing shared Rool space...</p>
          </div>
        {:else}
          <!-- Metrics Section -->
          <MetricsPanel 
            density={graphManager.getGraphDensity()} 
            connectionsCount={graphManager.connections.length}
            personsCount={graphManager.persons.filter(p => p.name).length}
          />

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <!-- Left Column: Graph & Search -->
            <div class="lg:col-span-8 space-y-6">
              <div class="relative group">
                <div class="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                <GraphCanvas 
                  persons={graphManager.persons.filter(p => p.name)} 
                  connections={graphManager.connections}
                  {shortestPath}
                  onNodeClick={(id) => {
                    if (!searchSource) searchSource = id;
                    else if (!searchTarget) {
                      searchTarget = id;
                      findPath();
                    } else {
                      searchSource = id;
                      searchTarget = '';
                      shortestPath = null;
                    }
                  }}
                />
              </div>

              <!-- Path Search UI -->
              <div class="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl flex flex-wrap items-center gap-4 group">
                <div class="flex-1 min-w-[200px]">
                  <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Source Person</label>
                  <select 
                    bind:value={searchSource}
                    class="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  >
                    <option value="">Select a person...</option>
                    {#each graphManager.persons.filter(p => p.name) as p}
                      <option value={p.id}>{p.name}</option>
                    {/each}
                  </select>
                </div>
                <div class="flex-1 min-w-[200px]">
                  <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Target Person</label>
                  <select 
                    bind:value={searchTarget}
                    class="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  >
                    <option value="">Select a person...</option>
                    {#each graphManager.persons.filter(p => p.name) as p}
                      <option value={p.id}>{p.name}</option>
                    {/each}
                  </select>
                </div>
                <button 
                  onclick={findPath}
                  disabled={!searchSource || !searchTarget}
                  class="bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-30 disabled:active:scale-100 text-white font-bold px-8 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 mt-6"
                >
                  Find Degrees
                </button>
                {#if shortestPath}
                  <div class="w-full mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between">
                    <p class="text-sm font-medium text-blue-300">
                      Distance: <span class="text-lg font-black text-white">{shortestPath.length - 1}</span> degrees of separation
                    </p>
                    <button onclick={() => {shortestPath = null; searchSource = ''; searchTarget = '';}} class="text-[10px] font-bold text-blue-400 uppercase tracking-widest hover:text-white transition-colors">Clear</button>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Right Column: Upload & Leaderboard -->
            <div class="lg:col-span-4 space-y-8">
              <div class="space-y-4">
                <h3 class="text-xs font-black text-gray-500 uppercase tracking-[0.2em] px-1">Data Ingestion</h3>
                <UploadPanel onUpload={handleUpload} {isUploading} />
                
                {#if lastUploadedPhoto}
                  <div class="mt-4 animate-in fade-in zoom-in duration-500">
                    <FaceTagger 
                      photoUri={lastUploadedPhoto.uri} 
                      appearances={currentAppearances}
                      persons={graphManager.persons}
                      onTag={handleTag}
                    />
                  </div>
                {/if}
              </div>

              <Leaderboard {topPersons} />
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

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slide-up {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .animate-in {
    animation: fade-in 0.5s ease-out forwards;
  }
</style>
