import { create } from "zustand";

interface AuthUiState {
  open: boolean;
  defaultPin: boolean;
  setOpen: (open: boolean) => void;
  setDefaultPin: (v: boolean) => void;
}

export const useAuthStore = create<AuthUiState>((set) => ({
  open: false,
  defaultPin: false,
  setOpen: (open) => set({ open }),
  setDefaultPin: (defaultPin) => set({ defaultPin }),
}));
