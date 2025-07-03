<script>
  export let original = '';
  export let combined = '';
  export let uiTexts = {};
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
    <div class="pane-title">{uiTexts['splitview.original'] || 'Original'}</div>
    <pre>{original}</pre>
  </div>
  <div class="pane">
    <div class="pane-title">{uiTexts['splitview.combined'] || 'Combiné'}</div>
    <pre>{combined}</pre>
  </div>
</div> 