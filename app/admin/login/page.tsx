"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { PasswordIcon } from "@/components/svgs/DefaultIcons";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

const AdminLogin = () => {
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(result?.message ?? "Unable to sign in as admin");
      }

      showToast("Logged in as admin", "success");
      router.push("/admin/dashboard/overview");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to sign in", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between px-8 py-10">
      <div className="w-[40%]">
        <img
          src="/admin-onboarding.png"
          alt="admin-onboarding"
          className="h-[90vh] w-full rounded-3xl object-cover"
        />
      </div>
      <div className="mx-auto flex w-[35%] flex-col">
        <h2 className="text-[40px] font-semibold">Welcome back</h2>
        <p className="text-[16px] text-[#A4A4A4]">
          Sign in to manage operations, vendors, riders, finances, and marketing
          activities.
        </p>

        <form className="mt-10 flex flex-col space-y-6" onSubmit={submitLogin}>
          <div className="flex flex-col space-y-3">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(event) =>
                setFormData((current) => ({ ...current, email: event.target.value }))
              }
              className="rounded-md border border-[#ccc] p-3 outline-none"
              placeholder="mandoadmin@gmail.com"
            />
          </div>

          <div className="flex flex-col space-y-3">
            <label htmlFor="password">Password</label>
            <div className="flex w-full items-center justify-between rounded-md border border-[#ccc] p-3">
              <div className="flex items-center space-x-3">
                <PasswordIcon />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={formData.password}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  className="border-none outline-none"
                  placeholder="********"
                />
              </div>

              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? (
                  <FaEyeSlash color="#808080" size={16} />
                ) : (
                  <FaEye color="#808080" size={16} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-[#DFB400] p-4 text-center font-semibold text-white transition hover:bg-[#C9A300] disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
