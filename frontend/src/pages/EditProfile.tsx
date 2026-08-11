import { useState } from "react";
import { useForm } from "react-hook-form";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { completeProfile, uploadAvatar } from "../lib/api";
import { resizeImageToDataUrl } from "../lib/image";
import { LEVEL_CHOICES } from "../types";

interface EditProfileFormValues {
    fullName: string;
    phone: string;
    level: number | null;
    universityId: string;
}

export default function EditProfile() {
    const { user, refreshUser } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
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
        formState: { errors },
    } = useForm<EditProfileFormValues>({
        defaultValues: {
            fullName: user?.full_name ?? "",
            phone: user?.phone_number ?? "",
            level: user?.level ?? null,
            universityId: user?.university_id ?? "",
        },
    });
    const selectedLevel = watch("level");

    const onSubmit = async (values: EditProfileFormValues) => {
        if (!values.level) {
            setError("Select your level.");
            return;
        }
        setSubmitting(true);
        setError(null);
        setSaved(false);
        try {
            await completeProfile({
                phone_number: values.phone,
                level: values.level,
                university_id: values.universityId.trim(),
                full_name: values.fullName.trim(),
            });
            await refreshUser();
            setSaved(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mx-auto max-w-lg py-space-lg md:py-space-xl">
            <h1 className="mb-space-xs text-headline-lg-mobile font-headline-lg-mobile text-on-surface md:text-headline-lg md:font-headline-lg">
                Edit profile
            </h1>
            <p className="mb-space-xl text-body-md font-body-md text-on-surface-variant">
                Update your details below.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-space-lg">
                <div className="flex flex-col gap-space-sm">
                    <label className="font-label-md text-label-md text-on-surface">Profile photo</label>
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

                <div className="flex flex-col gap-space-sm">
                    <label className="font-label-md text-label-md text-on-surface" htmlFor="fullName">
                        Full Name
                    </label>
                    <input
                        id="fullName"
                        type="text"
                        {...register("fullName", { required: "Please enter your full name." })}
                        className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    {errors.fullName && (
                        <p className="text-body-sm font-body-sm text-error">{errors.fullName.message}</p>
                    )}
                </div>

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
                                if (digits.length < 9) return "Phone number is too short.";
                                if (digits.length > 10) return "Phone number must be at most 10 digits.";
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

                <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md text-on-surface">Year/Academic Level</label>
                    <div role="group" aria-label="Year/Academic Level" className="mt-1 grid grid-cols-4 gap-2">
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
                </div>

                <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md text-on-surface" htmlFor="studentId">
                        Student ID
                    </label>
                    <input
                        id="studentId"
                        type="text"
                        {...register("universityId", { required: "Please enter your student ID." })}
                        placeholder="e.g. your university ID number"
                        className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 font-body-md text-body-md text-on-surface outline-none transition-colors placeholder:text-outline-variant focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    {errors.universityId && (
                        <p className="text-body-sm font-body-sm text-error">{errors.universityId.message}</p>
                    )}
                </div>

                {error && <p className="text-body-sm font-body-sm text-error">{error}</p>}
                {saved && !error && (
                    <p className="text-body-sm font-body-sm text-secondary">Profile updated.</p>
                )}

                <button
                    type="submit"
                    disabled={submitting}
                    className="h-12 w-full rounded-xl bg-primary font-label-md text-label-md text-on-primary transition-opacity hover:opacity-95 disabled:opacity-60"
                >
                    {submitting ? "Saving…" : "Save Changes"}
                </button>
            </form>
        </div>
    );
}
