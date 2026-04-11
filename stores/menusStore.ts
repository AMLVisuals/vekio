import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface MenuAliment {
  food_id: string;
  nom: string;
  quantite_g: number;
  calories: number;
  proteines: number;
  glucides: number;
  lipides: number;
}

export interface Menu {
  id: string;
  nom: string;
  photo_url: string | null;
  aliments: MenuAliment[];
  total_calories: number;
  total_proteines: number;
  total_glucides: number;
  total_lipides: number;
  created_at: string;
}

interface MenusState {
  menus: Menu[];
  isLoading: boolean;
  loadMenus: () => Promise<void>;
  addMenu: (nom: string, aliments: MenuAliment[], photoUri: string | null) => Promise<void>;
  updatePhoto: (menuId: string, photoUri: string) => Promise<void>;
  removeMenu: (id: string) => Promise<void>;
}

export const useMenusStore = create<MenusState>((set, get) => ({
  menus: [],
  isLoading: false,

  loadMenus: async () => {
    set({ isLoading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { set({ isLoading: false }); return; }

    const { data } = await supabase
      .from('menus')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      set({
        menus: data.map((row) => ({
          id: row.id,
          nom: row.nom,
          photo_url: row.photo_url,
          aliments: (row.aliments_json as MenuAliment[]) ?? [],
          total_calories: Number(row.total_calories),
          total_proteines: Number(row.total_proteines),
          total_glucides: Number(row.total_glucides),
          total_lipides: Number(row.total_lipides),
          created_at: row.created_at,
        })),
      });
    }
    set({ isLoading: false });
  },

  addMenu: async (nom, aliments, photoUri) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let photo_url: string | null = null;

    // Upload photo si fournie
    if (photoUri) {
      const fileName = `${user.id}/${Date.now()}.jpg`;

      // Lire le fichier en base64 (compatible Expo Go)
      const response = await fetch(photoUri);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from('menu-photos')
        .upload(fileName, uint8Array, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('menu-photos')
          .getPublicUrl(fileName);
        photo_url = urlData.publicUrl;
      }
    }

    const totals = {
      total_calories: aliments.reduce((s, a) => s + a.calories, 0),
      total_proteines: aliments.reduce((s, a) => s + a.proteines, 0),
      total_glucides: aliments.reduce((s, a) => s + a.glucides, 0),
      total_lipides: aliments.reduce((s, a) => s + a.lipides, 0),
    };

    const { error } = await supabase.from('menus').insert({
      user_id: user.id,
      nom,
      photo_url,
      aliments_json: aliments,
      ...totals,
    });

    if (!error) {
      await get().loadMenus();
    }
  },

  updatePhoto: async (menuId, photoUri) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fileName = `${user.id}/${Date.now()}.jpg`;
    const response = await fetch(photoUri);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('menu-photos')
      .upload(fileName, uint8Array, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('menu-photos')
        .getPublicUrl(fileName);

      await supabase
        .from('menus')
        .update({ photo_url: urlData.publicUrl })
        .eq('id', menuId);

      await get().loadMenus();
    }
  },

  removeMenu: async (id) => {
    await supabase.from('menus').delete().eq('id', id);
    set({ menus: get().menus.filter((m) => m.id !== id) });
  },
}));
