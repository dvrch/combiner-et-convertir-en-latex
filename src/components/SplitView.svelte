<script lang="ts">
  import { uiTexts } from '../stores/uiTexts.store';
  import { get } from 'svelte/store';
  export let original: string = '';
  export let combined: string = '';
  let texts = get(uiTexts);
  $: uiTexts.subscribe(val => texts = val);
</script>

<style>
.split-view {
  display: flex;
  width: 100%;
  height: 100%;
}
.pane {
  flex: 1;
  padding: 1rem;
  overflow: auto;
  border-right: 1px solid #ddd;
}
.pane:last-child {
  border-right: none;
}
.pane-title {
  font-weight: bold;
  margin-bottom: 0.5rem;
}
</style>

<div class="split-view">
  <div class="pane">
    <div class="pane-title">{texts.splitview?.original || 'Original'}</div>
    <pre>{original}</pre>
  </div>
  <div class="pane">
    <div class="pane-title">{texts.splitview?.combined || 'Combiné'}</div>
    <pre>{combined}</pre>
  </div>
</div> 