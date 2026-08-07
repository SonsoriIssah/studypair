import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
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
    const phoneValue = watch("phone");

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

    const canContinue = !!phoneValue && phoneValue.replace(/\D/g, "").length >= 9 && !!selectedLevel;

    return (
        <div className="flex min-h-screen flex-col bg-background font-body-md md:items-center md:justify-center">
            <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-surface-container-lowest md:min-h-[800px] md:overflow-hidden md:rounded-2xl md:shadow-lg">
                <header className="sticky top-0 z-10 flex items-center justify-between bg-surface-container-lowest px-container-margin py-space-md md:rounded-t-2xl">
                    <div className="w-10" />
                    <div className="text-label-md font-label-md font-medium tracking-wide text-on-surface-variant">
                        STEP 2 OF 2
                    </div>
                    <div className="w-10" />
                </header>

                <div className="h-1 w-full bg-surface-container-high">
                    <div className="h-full w-full origin-left rounded-r-full bg-primary" />
                </div>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex flex-1 flex-col px-container-margin pb-space-lg pt-space-xl"
                >
                    <div className="mb-space-xl">
                        <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-on-background mb-space-sm">
                            Help us set up your account
                        </h1>
                        <p className="text-body-md font-body-md text-on-surface-variant">
                            We just need a few more details to find the best study partners for you.
                        </p>
                    </div>

                    <div className="relative">
                        <label className="mb-1 block text-label-md font-label-md text-on-surface-variant">
                            Phone number
                        </label>
                        <div className="relative">
                            <input
                                type="tel"
                                {...register("phone", {
                                    required: "Phone number is required.",
                                })}
                                placeholder="e.g. 024xxxxxxx"
                                className="h-14 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-space-md text-body-lg font-body-lg text-on-surface transition-colors placeholder:text-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <div className="pointer-events-none absolute inset-y-0 right-space-md flex items-center text-on-surface-variant">
                                <Icon name="phone_iphone" className="text-[20px]" />
                            </div>
                        </div>
                        {errors.phone && (
                            <p className="mt-1 text-body-sm font-body-sm text-error">
                                {errors.phone.message}
                            </p>
                        )}
                    </div>

                    <div className="mt-space-sm flex flex-col gap-space-sm">
                        <label className="ml-1 text-label-md font-label-md text-on-surface-variant">
                            Academic Level
                        </label>
                        <div
                            role="group"
                            aria-label="Academic Level"
                            className="grid grid-cols-4 gap-2 rounded-xl border border-surface-container-high bg-surface-container-low p-1"
                        >
                            {LEVEL_CHOICES.map((l) => (
                                <button
                                    type="button"
                                    key={l}
                                    onClick={() => setValue("level", l)}
                                    className={`h-12 rounded-lg text-body-md font-body-md transition-all duration-200 ${
                                        selectedLevel === l
                                            ? "-translate-y-px border border-primary-container bg-primary-container font-semibold text-on-primary-container shadow-sm"
                                            : "border border-transparent text-on-surface hover:bg-surface-container-high"
                                    }`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                        <p className="ml-1 mt-1 text-body-sm font-body-sm text-outline">
                            Select your current course level (e.g., Freshman = 100).
                        </p>
                    </div>

                    {error && <p className="mt-space-md text-body-sm font-body-sm text-error">{error}</p>}

                    <div className="flex-1" />

                    <div className="mb-space-md flex items-center justify-center gap-2 text-on-surface-variant opacity-80">
                        <Icon name="lock" className="text-[16px]" />
                        <span className="text-label-sm font-label-sm">Your information is secure and private.</span>
                    </div>

                    <button
                        type="submit"
                        disabled={!canContinue || submitting}
                        className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-body-lg font-body-lg font-semibold text-on-primary shadow-sm transition-all duration-300 hover:opacity-95 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-surface-container-highest disabled:text-outline disabled:opacity-50 disabled:shadow-none"
                    >
                        <span>{submitting ? "Saving…" : "Continue"}</span>
                        {!submitting && <Icon name="arrow_forward" className="text-[20px]" />}
                    </button>
                </form>
            </main>
        </div>
    );
}
