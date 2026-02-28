"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

const UPDATE_ENDPOINT = "/api/submit";

type FormState = {
  type:
    | ""
    | "Add a pantry"
    | "Remove a pantry"
    | "Report an issue"
    | "Update pantry information"
    | "Other";
  pantry_name: string;
  pantry_address: string;
  issue_detail: string;
  email: string;
};

type FieldErrors = {
  type?: string;
  pantry_address?: string;
  issue_detail?: string;
};

export default function UpdatePage() {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>({
    type: "",
    pantry_name: "",
    pantry_address: "",
    issue_detail: "",
    email: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (
    field: keyof FormState,
    value: FormState[keyof FormState]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    if (status !== "idle") {
      setStatus("idle");
      setErrorMessage("");
    }
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};
    if (!formState.type) {
      nextErrors.type = "Please choose a type.";
    }
    if (!formState.pantry_address.trim()) {
      nextErrors.pantry_address = "Please add a pantry address.";
    }
    if (!formState.issue_detail.trim()) {
      nextErrors.issue_detail = "Please share details for this update.";
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const payload = {
        type: formState.type,
        pantry_name: formState.pantry_name,
        pantry_address: formState.pantry_address,
        issue_detail: formState.issue_detail,
        email: formState.email,
      };
      console.log("Submitting payload:", payload);
      const response = await fetch(UPDATE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      console.log("Response:", data);
      if (!response.ok) {
        setStatus("error");
        setErrorMessage(data?.error || "Something went wrong. Please try again.");
        return;
      }
      if (data?.ok === false) {
        setStatus("error");
        setErrorMessage(data?.error || "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
      setFormState({
        type: "",
        pantry_name: "",
        pantry_address: "",
        issue_detail: "",
        email: "",
      });
      setFieldErrors({});
    } catch (error) {
      console.error(error);
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    }
  };

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-6 pt-8">
        <button
          type="button"
          onClick={() => router.push("/about-us")}
          className="mb-4 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-emerald-700 transition hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2"
          aria-label="Back to About Us"
        >
          <ChevronLeft className="h-8 w-8" strokeWidth={2.5} />
        </button>
      </div>
      <main className="mx-auto w-full max-w-3xl px-6 pb-8">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold text-neutral-900">Update & Report Issue</h1>
          <p className="mt-3 text-lg leading-relaxed text-neutral-900">
            Report an issue or suggest an update to a micro-pantry listing.
          </p>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-base font-medium text-neutral-900">
            Select a type
            <select
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition hover:border-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2"
              value={formState.type}
              onChange={(event) =>
                handleChange("type", event.target.value as FormState["type"])
              }
            >
              <option value="">Select a type</option>
              <option value="Add a pantry">Add a pantry</option>
              <option value="Remove a pantry">Remove a pantry</option>
              <option value="Report an issue">Report an issue</option>
              <option value="Update pantry information">Update pantry information</option>
              <option value="Other">Other</option>
            </select>
            {fieldErrors.type ? (
              <span className="mt-2 block text-xs text-rose-600">
                {fieldErrors.type}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2 text-base font-medium text-neutral-900">
            Pantry name
            <input
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition hover:border-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2"
              type="text"
              value={formState.pantry_name}
              onChange={(event) => handleChange("pantry_name", event.target.value)}
              placeholder="Optional"
            />
          </label>

          <label className="flex flex-col gap-2 text-base font-medium text-neutral-900">
            Pantry address
            <input
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition hover:border-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2"
              type="text"
              value={formState.pantry_address}
              onChange={(event) =>
                handleChange("pantry_address", event.target.value)
              }
              placeholder="Required"
            />
            {fieldErrors.pantry_address ? (
              <span className="mt-1 block text-xs text-rose-600">
                {fieldErrors.pantry_address}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2 text-base font-medium text-neutral-900">
            Issue detail
            <textarea
              className="min-h-[140px] w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition hover:border-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2"
              value={formState.issue_detail}
              onChange={(event) =>
                handleChange("issue_detail", event.target.value)
              }
              placeholder="Share details about the update or issue"
            />
            {fieldErrors.issue_detail ? (
              <span className="mt-2 block text-xs text-rose-600">
                {fieldErrors.issue_detail}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2 text-base font-medium text-neutral-900">
            Email
            <input
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition hover:border-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2"
              type="email"
              value={formState.email}
              onChange={(event) => handleChange("email", event.target.value)}
              placeholder="Optional"
            />
          </label>

          <div className="pt-6">
            <button
              className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={status === "loading"}
            >
              {status === "loading" ? "Submitting..." : "Submit update"}
            </button>
            {status === "success" ? (
              <p className="mt-3 text-sm font-medium text-emerald-700">
                Submitted
              </p>
            ) : null}
            {status === "error" ? (
              <p className="mt-3 text-sm font-medium text-rose-600">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </form>
        </section>
      </main>
    </>
  );
}
