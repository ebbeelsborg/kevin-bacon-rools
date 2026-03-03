<script lang="ts">
  import type { Person } from '../types';

  interface Props {
    topPersons: (Person & { connections: number })[];
  }

  let { topPersons }: Props = $props();
</script>

<div class="bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700 p-6 shadow-xl">
  <div class="flex items-center gap-3 mb-6">
    <div class="p-2 bg-blue-500/20 rounded-lg">
      <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    </div>
    <h3 class="text-lg font-bold text-gray-100 uppercase tracking-wider">Most Connected</h3>
  </div>

  <div class="space-y-4">
    {#each topPersons as person, i}
      <div class="flex items-center justify-between p-3 rounded-xl bg-gray-900/50 border border-gray-700/50 hover:border-blue-500/50 transition-all group">
        <div class="flex items-center gap-4">
          <div class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-300 group-hover:bg-blue-600 transition-colors">
            {i + 1}
          </div>
          <div>
            <p class="text-sm font-medium text-gray-200">{person.name || 'Anonymous'}</p>
            <p class="text-[10px] text-gray-500 uppercase tracking-tighter">Person Node</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-lg font-bold text-blue-400">{person.connections}</p>
          <p class="text-[10px] text-gray-500 uppercase">Edges</p>
        </div>
      </div>
    {/each}

    {#if topPersons.length === 0}
      <p class="text-center text-gray-500 text-sm py-4">No connections found yet.</p>
    {/if}
  </div>
</div>
