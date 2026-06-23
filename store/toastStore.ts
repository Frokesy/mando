import create from "zustand";

export type Toast = {
  id: string;
  message: string;
  type: "success" | "info" | "error";
};

type ToastState = {
  toasts: Toast[];
  showToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
};

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  showToast: (message, type = "success") => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));

    window.setTimeout(() => {
      get().removeToast(id);
    }, 2500);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export default useToastStore;
