<script lang="ts">
  interface Props {
    density: number;
    connectionsCount: number;
    personsCount: number;
  }

  let { density, connectionsCount, personsCount }: Props = $props();
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div class="bg-gray-800/50 backdrop-blur-md p-6 rounded-2xl border border-gray-700 shadow-xl group">
    <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Graph Density</p>
    <div class="flex items-end gap-2">
      <h4 class="text-3xl font-black text-blue-400">{(density * 100).toFixed(2)}%</h4>
      <div class="w-full h-1.5 bg-gray-700 rounded-full mb-2.5 overflow-hidden">
        <div class="h-full bg-blue-500 transition-all duration-1000" style="width: {density * 100}%"></div>
      </div>
    </div>
  </div>

  <div class="bg-gray-800/50 backdrop-blur-md p-6 rounded-2xl border border-gray-700 shadow-xl group">
    <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Knowers</p>
    <h4 class="text-3xl font-black text-emerald-400">{personsCount}</h4>
    <p class="text-xs text-gray-500 mt-1">Unique tagged individuals</p>
  </div>

  <div class="bg-gray-800/50 backdrop-blur-md p-6 rounded-2xl border border-gray-700 shadow-xl group">
    <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Edges</p>
    <h4 class="text-3xl font-black text-amber-400">{connectionsCount}</h4>
    <p class="text-xs text-gray-500 mt-1">Active social relationships</p>
  </div>
</div>
