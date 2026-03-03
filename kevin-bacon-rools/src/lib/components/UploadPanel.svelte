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
    ? 'border-blue-500 bg-blue-950'
    : 'border-gray-700 bg-gray-800 hover:bg-gray-750'}"
  ondrop={handleDrop}
  ondragover={handleDragOver}
  role="button"
  tabindex="0"
>
  {#if isProcessing}
    <div class="flex items-center gap-3">
      <div
        class="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"
      ></div>
      <p class="text-sm text-blue-400 font-medium">Identifying people...</p>
    </div>
  {:else}
    <div
      class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center group-hover:scale-110 transition-transform"
    >
      <svg
        class="w-5 h-5 text-gray-400"
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
      <p class="text-gray-200 font-medium text-sm">Drop a photo here</p>
      <p class="text-gray-500 text-xs mt-0.5">PNG or JPG only</p>
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
      class="w-full mt-2 px-3 py-2 bg-red-950 border border-red-800 rounded-lg"
    >
      <p class="text-xs text-red-400 font-medium">{errorMessage}</p>
    </div>
  {/if}
</div>

<style>
  .bg-gray-750:hover {
    background-color: rgba(55, 65, 81, 0.8);
  }
</style>
