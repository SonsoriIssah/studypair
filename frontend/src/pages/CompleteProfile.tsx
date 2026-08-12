import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { completeProfile, uploadAvatar } from "../lib/api";
import { resizeImageToDataUrl } from "../lib/image";
import { LEVEL_CHOICES } from "../types";

interface CompleteProfileFormValues {
    fullName: string;
    phone: string;
    level: number | null;
    universityId: string;
}

export default function CompleteProfile() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_data_url ?? null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const onAvatarSelected = async (file: File | undefined) => {
        if (!file) return;
        setUploadingAvatar(true);
        setError(null);
        try {
            const dataUrl = await resizeImageToDataUrl(file);
            await uploadAvatar(dataUrl);
            setAvatarPreview(dataUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not upload photo.");
        } finally {
            setUploadingAvatar(false);
        }
    };
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isValid },
    } = useForm<CompleteProfileFormValues>({
        mode: "onChange",
        defaultValues: {
            fullName: user?.full_name ?? "",
            phone: "",
            level: null,
            universityId: "",
        },
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
                full_name: values.fullName.trim(),
                university_id: values.universityId.trim(),
            });
            await refreshUser();
            navigate("/dashboard", { replace: true });
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Something went wrong."
            );
        } finally {
            setSubmitting(false);
        }
    };

    // Level is set via the button group below, not a registered input, so
    // it isn't part of react-hook-form's own validity — checked alongside
    // isValid rather than folded into it.
    const canContinue = !!selectedLevel && isValid;

    return (
        <div className="min-h-screen overflow-hidden bg-surface text-on-surface antialiased">
            {/* Dimmed dashboard background */}
            <div className="pointer-events-none fixed inset-0 z-0 grayscale-[20%] opacity-40">
                <header className="fixed top-0 z-10 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface px-container-margin shadow-sm">
                    <div className="flex items-center gap-space-sm text-primary">
                        <Icon name="school" filled className="text-headline-md font-headline-md" />
                        <span className="font-headline-md text-headline-md font-bold">StudyPair</span>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-variant">
                        <Icon name="person" className="text-outline" />
                    </div>
                </header>

                <main className="mx-auto h-screen max-w-7xl overflow-hidden px-container-margin pb-32 pt-24">
                    <div className="mx-auto mb-space-xl max-w-2xl">
                        <div className="relative">
                            <Icon
                                name="search"
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant"
                            />
                            <input
                                className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-12 pr-4"
                                placeholder="Search courses or peers..."
                                readOnly
                                type="text"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-space-lg md:grid-cols-2 lg:grid-cols-3">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className={`h-48 rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md shadow-sm ${
                                    i === 2 ? "hidden md:block" : ""
                                }`}
                            >
                                <div className="mb-4 h-4 w-1/3 rounded bg-surface-container-high" />
                                <div className="mb-4 h-8 w-2/3 rounded bg-surface-container-high" />
                                <div className="h-4 w-1/2 rounded bg-surface-container-high" />
                            </div>
                        ))}
                    </div>
                </main>
            </div>

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-on-surface/40 p-container-margin backdrop-blur-sm md:p-space-xl">
                <div className="relative my-auto flex w-full max-w-lg flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl">
                    <div className="border-b border-outline-variant/30 p-space-lg md:p-space-xl">
                        <h1 className="mb-space-xs font-headline-lg-mobile text-headline-lg-mobile text-on-surface md:font-headline-lg md:text-headline-lg">
                            Complete your profile
                        </h1>
                        <p className="font-body-md text-body-md text-on-surface-variant">
                            Just a few details before you get started.
                        </p>
                    </div>

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="flex flex-col gap-space-lg p-space-lg md:p-space-xl"
                    >
                        {/* Profile Photo */}
                        <div className="flex flex-col gap-space-sm">
                            <label className="font-label-md text-label-md text-on-surface">
                                Profile photo{" "}
                                <span className="font-normal text-on-surface-variant">(Optional)</span>
                            </label>
                            <div className="flex items-center gap-space-md">
                                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-dashed border-outline-variant bg-surface-container-high">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <Icon name="person" className="text-2xl text-outline-variant" />
                                    )}
                                </div>
                                <label
                                    className={`cursor-pointer rounded-lg border border-outline px-4 py-2 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-low ${
                                        uploadingAvatar ? "cursor-not-allowed opacity-50" : ""
                                    }`}
                                >
                                    {uploadingAvatar ? "Uploading…" : avatarPreview ? "Change Photo" : "Upload Photo"}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        disabled={uploadingAvatar}
                                        onChange={(e) => onAvatarSelected(e.target.files?.[0])}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Full Name */}
                        <div className="flex flex-col gap-space-sm">
                            <label className="font-label-md text-label-md text-on-surface" htmlFor="fullName">
                                Full Name
                            </label>
                            <input
                                id="fullName"
                                type="text"
                                {...register("fullName", {
                                    required: "Please enter your full name.",
                                })}
                                className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                            {errors.fullName && (
                                <p className="text-body-sm font-body-sm text-error">{errors.fullName.message}</p>
                            )}
                        </div>

                        {/* Phone Number */}
                        <div className="flex flex-col gap-space-sm">
                            <label className="font-label-md text-label-md text-on-surface" htmlFor="phone">
                                Phone Number
                            </label>
                            <input
                                id="phone"
                                type="tel"
                                inputMode="numeric"
                                maxLength={14}
                                {...register("phone", {
                                    required: "Phone number is required.",
                                    validate: (value) => {
                                        const digits = value.replace(/\D/g, "");
                                        if (digits.length !== 10) return "Phone number must be 10 digits.";
                                        return true;
                                    },
                                })}
                                placeholder="e.g. 024 000 0000"
                                className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 font-body-md text-body-md text-on-surface outline-none transition-colors placeholder:text-outline-variant focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                            {errors.phone && (
                                <p className="text-body-sm font-body-sm text-error">{errors.phone.message}</p>
                            )}
                        </div>

                        {/* Year/Academic Level */}
                        <div className="flex flex-col gap-space-xs">
                            <label className="font-label-md text-label-md text-on-surface">
                                Year/Academic Level
                            </label>
                            <div
                                role="group"
                                aria-label="Year/Academic Level"
                                className="mt-1 grid grid-cols-4 gap-2"
                            >
                                {LEVEL_CHOICES.map((l) => (
                                    <button
                                        type="button"
                                        key={l}
                                        onClick={() => setValue("level", l)}
                                        className={`rounded-lg border py-2 text-center font-label-md text-label-md transition-colors ${
                                            selectedLevel === l
                                                ? "border-primary bg-primary-container text-on-primary-container"
                                                : "border-outline-variant text-on-surface hover:bg-surface-container-low"
                                        }`}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                                This helps us match you with the right courses.
                            </p>
                        </div>

                        {/* Student ID */}
                        <div className="flex flex-col gap-space-xs">
                            <label className="font-label-md text-label-md text-on-surface" htmlFor="studentId">
                                Student ID
                            </label>
                            <input
                                id="studentId"
                                type="text"
                                {...register("universityId", {
                                    required: "Please enter your student ID.",
                                    validate: (value) => {
                                        if (value.trim().length !== 8) return "Student ID must be 8 characters.";
                                        return true;
                                    },
                                })}
                                maxLength={8}
                                placeholder="e.g. your university ID number"
                                className="mt-1 h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 font-body-md text-body-md text-on-surface outline-none transition-colors placeholder:text-outline-variant focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                            {errors.universityId ? (
                                <p className="text-body-sm font-body-sm text-error">{errors.universityId.message}</p>
                            ) : (
                                <p className="font-body-sm text-body-sm text-on-surface-variant">
                                    Your official university ID number.
                                </p>
                            )}
                        </div>

                        {error && <p className="text-body-sm font-body-sm text-error">{error}</p>}
                    </form>

                    <div className="rounded-b-2xl border-t border-outline-variant/30 bg-surface-container-low/50 p-space-lg md:p-space-xl">
                        <button
                            type="submit"
                            onClick={handleSubmit(onSubmit)}
                            disabled={!canContinue || submitting}
                            className={`h-12 w-full rounded-xl font-label-md text-label-md transition-colors ${
                                canContinue && !submitting
                                    ? "bg-primary text-on-primary hover:opacity-95"
                                    : "cursor-not-allowed bg-surface-dim text-outline"
                            }`}
                        >
                            {submitting ? "Saving…" : "Save & Continue"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
