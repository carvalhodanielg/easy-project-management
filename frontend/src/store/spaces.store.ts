import { create } from 'zustand';
import { Space } from '../types/space.types';

interface SpacesState {
  currentSpace: Space | null;
  setCurrentSpace: (space: Space | null) => void;
}

export const useSpacesStore = create<SpacesState>()((set) => ({
  currentSpace: null,
  setCurrentSpace: (space) => set({ currentSpace: space }),
}));
