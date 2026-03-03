<script lang="ts">
  import type { Appearance, Person } from '../types';

  interface Props {
    photoUri: string;
    appearances: Appearance[];
    persons: Person[];
    onTag: (personId: string, name: string) => void;
  }

  let { photoUri, appearances, persons, onTag }: Props = $props();

  let selectedAppearanceId = $state<string | null>(null);
  let tagName = $state('');

  function handleTagSubmit() {
    if (selectedAppearanceId && tagName.trim()) {
      const app = appearances.find(a => a.id === selectedAppearanceId);
      if (app) {
        onTag(app.personId, tagName.trim());
        tagName = '';
        selectedAppearanceId = null;
      }
    }
  }

  function getPerson(personId: string) {
    return persons.find(p => p.id === personId);
  }
</script>

<div class="space-y-4">
  <div class="relative inline-block rounded-xl overflow-hidden shadow-xl border border-gray-800">
    <img src={photoUri} alt="Uploaded" class="max-w-full block" />
    
    {#each appearances as app (app.id)}
      {@const person = getPerson(app.personId)}
      <button 
        class="absolute border-2 transition-all cursor-pointer group"
        style="
          left: {app.boundingBox.x * 100}%;
          top: {app.boundingBox.y * 100}%;
          width: {app.boundingBox.width * 100}%;
          height: {app.boundingBox.height * 100}%;
          border-color: {selectedAppearanceId === app.id ? '#3b82f6' : (person?.name ? '#10b981' : '#f59e0b')};
          background-color: {selectedAppearanceId === app.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent'};
        "
        onclick={() => selectedAppearanceId = app.id}
      >
        {#if person?.name}
          <div class="absolute -top-6 left-0 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap font-bold uppercase tracking-wider">
            {person.name}
          </div>
        {:else if selectedAppearanceId === app.id}
          <div class="absolute -top-6 left-0 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap font-bold uppercase tracking-wider">
            Naming...
          </div>
        {:else}
           <div class="absolute -top-6 left-0 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
            Untagged
          </div>
        {/if}
      </button>
    {/each}
  </div>

  {#if selectedAppearanceId}
    <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 flex gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
      <input 
        type="text" 
        placeholder="Enter name..." 
        bind:value={tagName}
        class="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onkeydown={(e) => e.key === 'Enter' && handleTagSubmit()}
      />
      <button 
        onclick={handleTagSubmit}
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        Tag
      </button>
      <button 
        onclick={() => selectedAppearanceId = null}
        class="text-gray-400 hover:text-gray-200 px-2"
      >
        Cancel
      </button>
    </div>
  {/if}
</div>
