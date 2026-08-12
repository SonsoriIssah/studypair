import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { completeProfile, deleteAccount, uploadAvatar } from "../lib/api";
import { resizeImageToDataUrl } from "../lib/image";
import { LEVEL_CHOICES } from "../types";

const DELETE_CONFIRMATION_WORD = "DELETE";

interface EditProfileFormValues {
    fullName: string;
    phone: string;
    level: number | null;
    universityId: string;
}

export default function EditProfile() {
    const { user, refreshUser, logout } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_data_url ?? null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const confirmDelete = async () => {
        setDeleting(true);
        setDeleteError(null);
        try {
            await deleteAccount();
            logout();
            navigate("/", { replace: true });
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : "Could not delete your account.");
            setDeleting(false);
        }
    };

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
                        {...register("universityId", {
                            required: "Please enter your student ID.",
                            validate: (value) => {
                                if (value.trim().length !== 8) return "Student ID must be 8 characters.";
                                return true;
                            },
                        })}
                        maxLength={8}
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

            <div className="mt-space-xl rounded-xl border border-error/30 bg-error-container/20 p-space-lg">
                <h2 className="mb-space-xs text-headline-md font-headline-md text-on-surface">Danger zone</h2>
                <p className="mb-space-md text-body-sm font-body-sm text-on-surface-variant">
                    Deleting your account permanently removes your profile, courses, availability, requests, and
                    applications. This cannot be undone.
                </p>
                <button
                    type="button"
                    onClick={() => setDeleteModalOpen(true)}
                    className="rounded-lg border border-error px-4 py-2 font-label-md text-label-md text-error transition-colors hover:bg-error-container"
                >
                    Delete Account
                </button>
            </div>

            {deleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg shadow-2xl">
                        <h3 className="mb-space-xs text-headline-md font-headline-md text-on-surface">
                            Delete your account?
                        </h3>
                        <p className="mb-space-md text-body-sm font-body-sm text-on-surface-variant">
                            This is permanent — your profile, courses, availability, requests, and applications
                            will all be deleted. Type <span className="font-bold">{DELETE_CONFIRMATION_WORD}</span>{" "}
                            to confirm.
                        </p>
                        <input
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder={DELETE_CONFIRMATION_WORD}
                            className="mb-space-md h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 font-body-md text-body-md text-on-surface outline-none focus:border-error focus:ring-1 focus:ring-error"
                        />
                        {deleteError && (
                            <p className="mb-space-md text-body-sm font-body-sm text-error">{deleteError}</p>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setDeleteModalOpen(false);
                                    setDeleteConfirmText("");
                                    setDeleteError(null);
                                }}
                                className="flex-1 rounded-xl bg-surface-container-high px-4 py-3 text-label-md font-label-md text-on-surface transition-colors hover:bg-surface-container-highest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleteConfirmText !== DELETE_CONFIRMATION_WORD || deleting}
                                className="flex-1 rounded-xl bg-error px-4 py-3 text-label-md font-label-md text-on-error transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                {deleting ? "Deleting…" : "Delete Account"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
