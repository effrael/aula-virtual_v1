import { create } from "zustand";

export type Role = "superadmin" | "admin" | "docente" | "alumno" | "colaborador";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
}

interface AuthStore {
  profile: Profile | null;
  isLoading: boolean;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  profile: null,
  isLoading: true,
  setProfile: (profile) => set({ profile, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ profile: null, isLoading: false }),
}));
