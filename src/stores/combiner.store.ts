import { writable } from 'svelte/store';

export const combinerState = writable({
  original: '',
  combined: '',
});

export function setOriginal(content: string) {
  combinerState.update(state => ({ ...state, original: content }));
}

export function setCombined(content: string) {
  combinerState.update(state => ({ ...state, combined: content }));
} 