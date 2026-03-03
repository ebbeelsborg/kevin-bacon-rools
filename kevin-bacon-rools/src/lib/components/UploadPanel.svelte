<script lang="ts">
  interface Props {
    onUpload: (file: File) => void;
    isProcessing: boolean;
    errorMessage: string;
  }

  let { onUpload, isProcessing, errorMessage }: Props = $props();

  const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];

  function validateAndUpload(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return;
    }
    onUpload(file);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) validateAndUpload(file);
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
  }

  function handleFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) validateAndUpload(file);
    input.value = "";
  }
</script>

<div
  class="relative p-6 border-2 border-dashed rounded-2xl transition-all flex flex-col items-center justify-center gap-3 text-center group {isProcessing
    ? 'border-blue-500 bg-blue-50/50'
    : 'border-slate-200 bg-slate-50 hover:bg-white'}"
  ondrop={handleDrop}
  ondragover={handleDragOver}
  role="button"
  tabindex="0"
>
  {#if isProcessing}
    <div class="flex items-center gap-3">
      <div
        class="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"
      ></div>
      <p class="text-sm text-blue-600 font-bold">Identifying people...</p>
    </div>
  {:else}
    <div
      class="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform"
    >
      <svg
        class="w-5 h-5 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
    <div>
      <p class="text-slate-800 font-bold text-sm">Drop a photo here</p>
      <p class="text-slate-400 text-xs mt-0.5">PNG or JPG only</p>
    </div>
    <input
      type="file"
      accept="image/png,image/jpeg"
      class="absolute inset-0 opacity-0 cursor-pointer"
      onchange={handleFileInput}
    />
  {/if}

  {#if errorMessage}
    <div
      class="w-full mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg"
    >
      <p class="text-xs text-red-600 font-bold">{errorMessage}</p>
    </div>
  {/if}
</div>

<style>
</style>
