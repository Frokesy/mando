import create from "zustand";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type AuthUser = {
  id: string;
  email: string;
  status: string;
  createdAt: string;
};

type AuthProfile = {
  fullName: string;
  phone: string | null;
  birthday: string | null;
  avatarUrl: string | null;
} | null;

export type AuthPayload = {
  user: AuthUser;
  profile: AuthProfile;
  roles: string[];
};

type AuthState = {
  auth: AuthPayload | null;
  loading: boolean;
  setAuth: (auth: AuthPayload | null) => void;
  fetchCurrentUser: () => Promise<AuthPayload | null>;
  updateCustomerProfile: (profile: CustomerProfileUpdate) => Promise<AuthPayload>;
  logout: () => Promise<void>;
};

type CustomerProfileUpdate = {
  fullName?: string;
  phone?: string | null;
  birthday?: string | null;
  avatarUrl?: string | null;
};

export const useAuthStore = create<AuthState>((set) => ({
  auth: null,
  loading: false,
  setAuth: (auth) => set({ auth }),
  fetchCurrentUser: async () => {
    set({ loading: true });

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: "include",
      });

      if (!response.ok) {
        set({ auth: null });
        return null;
      }

      const auth = (await response.json()) as AuthPayload;
      set({ auth });
      return auth;
    } finally {
      set({ loading: false });
    }
  },
  updateCustomerProfile: async (profile) => {
    const response = await fetch(`${API_BASE_URL}/customer/profile`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      throw new Error(errorBody?.message ?? "Unable to update profile");
    }

    const auth = (await response.json()) as AuthPayload;
    set({ auth });
    return auth;
  },
  logout: async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      set({ auth: null });
    }
  },
}));

export default useAuthStore;
