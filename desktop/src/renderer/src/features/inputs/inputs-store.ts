import { create } from 'zustand';

interface InputsState {
  snippetOpen: boolean;
  notesOpen: boolean;
  setSnippetOpen(open: boolean): void;
  setNotesOpen(open: boolean): void;
}

export const useInputsStore = create<InputsState>()((set) => ({
  snippetOpen: false,
  notesOpen: false,
  setSnippetOpen: (snippetOpen) => set({ snippetOpen }),
  setNotesOpen: (notesOpen) => set({ notesOpen }),
}));
