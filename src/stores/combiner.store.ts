// Store simplifié sans réactivité Svelte
export interface CombinerState {
  original: string;
  combined: string;
}

let combinerState: CombinerState = {
  original: '',
  combined: '',
};

export function getCombinerState(): CombinerState {
  return { ...combinerState };
}

export function setOriginal(content: string) {
  combinerState = { ...combinerState, original: content };
}

export function setCombined(content: string) {
  combinerState = { ...combinerState, combined: content };
} 