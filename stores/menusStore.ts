import { create } from 'zustand';
import type { JournalEntry } from './journalStore';

export interface Menu {
  id: string;
  nom: string;
  photo_url: string | null;
  aliments: Omit<JournalEntry, 'id' | 'repas'>[];
  created_at: string;
}

interface MenusState {
  menus: Menu[];
  setMenus: (menus: Menu[]) => void;
  addMenu: (menu: Menu) => void;
  removeMenu: (id: string) => void;
}

export const useMenusStore = create<MenusState>((set, get) => ({
  menus: [],

  setMenus: (menus) => set({ menus }),

  addMenu: (menu) => set({ menus: [...get().menus, menu] }),

  removeMenu: (id) => set({ menus: get().menus.filter((m) => m.id !== id) }),
}));
