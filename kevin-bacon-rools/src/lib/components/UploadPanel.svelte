<script lang="ts">
  interface Props {
    onUpload: (fileData: string) => void;
    isUploading: boolean;
  }

  let { onUpload, isUploading }: Props = $props();

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onUpload(result);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onUpload(result);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
  }
</script>

<div 
  class="relative p-8 border-2 border-dashed border-gray-700 rounded-2xl bg-gray-800/50 hover:bg-gray-800/80 transition-all flex flex-col items-center justify-center gap-4 text-center group"
  ondrop={handleDrop}
  ondragover={handleDragOver}
>
  {#if isUploading}
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    <p class="text-gray-400">Processing image...</p>
  {:else}
    <div class="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center group-hover:scale-110 transition-transform">
      <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
    </div>
    <div>
      <p class="text-gray-200 font-medium text-lg">Upload Photo</p>
      <p class="text-gray-400 text-sm mt-1">Drag and drop or click to browse</p>
    </div>
    <input 
      type="file" 
      accept="image/*" 
      class="absolute inset-0 opacity-0 cursor-pointer" 
      onchange={handleFileChange}
    />
  {/if}
</div>
