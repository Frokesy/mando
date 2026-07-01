"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CautionIcon,
  EyeIcon,
  EyeOffIcon,
  PasswordIcon,
} from "@/components/svgs/DefaultIcons";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export default function SalesAgentSignup() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const [referralCode, setReferralCode] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setReferralCode(new URLSearchParams(window.location.search).get("ref") ?? "");
  }, []);

  const referralMissing = !referralCode;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (referralMissing) {
      showToast("A valid influencer referral link is required", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/sales-agent/signup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, referralCode }),
      });

      const result = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        if (response.status === 409) {
          setFieldErrors((current) => ({
            ...current,
            email: "An account with this email already exists",
          }));
        }

        throw new Error(result?.message ?? "Unable to submit application");
      }

      showToast("Application submitted. Admin approval is required.", "success");
      router.push("/sales-agent/login");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to submit application",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex min-h-screen items-center justify-center bg-[#F8F8F8] p-6"
    >
      <div className="w-full max-w-[440px] rounded-[32px] border border-[#E9EAEB] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-bold text-[#141B34]">Sales agent application</h1>
        <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">
          Apply through an influencer referral link. Admin will review your
          application before dashboard access is enabled.
        </p>

        {referralMissing ? (
          <div className="mt-6 rounded-3xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            A verified influencer referral link is required to apply as a sales
            agent.
          </div>
        ) : null}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <Field
            label="Full name"
            name="fullName"
            value={formData.fullName}
            error={fieldErrors.fullName}
            onChange={handleChange}
            placeholder="Enter your full name"
          />

          <Field
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            error={fieldErrors.email}
            onChange={handleChange}
            placeholder="Enter your email"
          />

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#141B34]">
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                <PasswordIcon />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                className="w-full rounded-2xl border border-[#E9EAEB] bg-[#F9F9F9] px-4 py-4 pl-12 pr-12 text-sm text-[#141B34] focus:outline-none focus:ring-2 focus:ring-[#DFB400]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {fieldErrors.password ? (
              <ErrorText message={fieldErrors.password} />
            ) : null}
          </div>

          <button
            type="submit"
            disabled={loading || referralMissing}
            className="w-full rounded-2xl bg-[#141B34] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#101828] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Submit application"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#6B6B6B]">
          Already approved?{" "}
          <Link href="/sales-agent/login" className="font-semibold text-[#141B34]">
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

function Field({
  label,
  name,
  type = "text",
  value,
  error,
  placeholder,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  error?: string;
  placeholder: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[#141B34]">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[#E9EAEB] bg-[#F9F9F9] px-4 py-4 text-sm text-[#141B34] focus:outline-none focus:ring-2 focus:ring-[#DFB400]"
      />
      {error ? <ErrorText message={error} /> : null}
    </div>
  );
}

function ErrorText({ message }: { message: string }) {
  return (
    <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
      <CautionIcon color="#E53935" size={14} />
      <span>{message}</span>
    </div>
  );
}
