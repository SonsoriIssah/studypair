import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { completeProfile } from "../lib/api";
import { LEVEL_CHOICES } from "../types";

interface CompleteProfileFormValues {
    phone: string;
    level: number | null;
}

export default function CompleteProfile() {
    const { refreshUser } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<CompleteProfileFormValues>({
        defaultValues: { phone: "", level: null },
    });
    const selectedLevel = watch("level");

    const onSubmit = async (values: CompleteProfileFormValues) => {
        if (!values.level) {
            setError("Select your level.");
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await completeProfile({
                phone_number: values.phone,
                level: values.level,
            });
            await refreshUser();
            navigate("/", { replace: true });
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Something went wrong."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
            >
                <h1 className="text-xl font-semibold text-slate-900">
                    Complete your profile
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    We need this before you can browse tutors — your level
                    determines who you'll see.
                </p>

                <label className="mt-6 block text-sm font-medium text-slate-700">
                    Phone number
                </label>
                <input
                    type="tel"
                    {...register("phone", {
                        required: "Phone number is required.",
                    })}
                    placeholder="e.g. 024xxxxxxx"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                {errors.phone && (
                    <p className="mt-1 text-xs text-red-600">
                        {errors.phone.message}
                    </p>
                )}

                <label className="mt-4 block text-sm font-medium text-slate-700">
                    Level
                </label>
                <div className="mt-1 grid grid-cols-4 gap-2">
                    {LEVEL_CHOICES.map((l) => (
                        <button
                            type="button"
                            key={l}
                            onClick={() => setValue("level", l)}
                            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                                selectedLevel === l
                                    ? "border-teal-600 bg-teal-50 text-teal-700"
                                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            {l}
                        </button>
                    ))}
                </div>

                {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

                <button
                    type="submit"
                    disabled={submitting}
                    className="mt-6 w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-60"
                >
                    {submitting ? "Saving…" : "Continue"}
                </button>
            </form>
        </div>
    );
}
