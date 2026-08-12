import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { ApiError, forgotPassword } from "../lib/api";

interface ForgotPasswordFormValues {
    email: string;
}

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormValues>({ defaultValues: { email: "" } });

    const onSubmit = async (values: ForgotPasswordFormValues) => {
        setError(null);
        setSubmitting(true);
        try {
            const email = values.email.trim().toLowerCase();
            await forgotPassword(email);
            // The backend responds identically whether or not the account
            // exists (no enumeration), so this always proceeds to the code
            // screen — there's nothing else to branch on here.
            navigate("/reset-password", { state: { email } });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Could not send a reset code.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-container-margin md:p-8">
            <main className="mx-auto w-full max-w-md">
                <div className="flex flex-col items-center rounded-xl border border-outline-variant bg-surface-container-lowest p-space-xl text-center shadow-lg">
                    <div className="mb-space-lg flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                        <Icon name="lock_reset" filled className="text-[32px]" />
                    </div>

                    <h1 className="mb-space-xs text-headline-lg font-headline-lg text-on-surface">
                        Reset your password
                    </h1>
                    <p className="mb-space-xl text-body-md font-body-md text-on-surface-variant">
                        Enter the email on your account and we'll send you a 6-digit code to reset your
                        password.
                    </p>

                    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-space-sm text-left">
                        <div>
                            <input
                                type="email"
                                autoFocus
                                {...register("email", { required: "Please enter your email." })}
                                placeholder="you@example.com"
                                className="h-14 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-space-md text-body-md font-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            {errors.email && (
                                <p className="mt-1 text-body-sm font-body-sm text-error">{errors.email.message}</p>
                            )}
                        </div>

                        {error && <p className="text-body-sm font-body-sm text-error">{error}</p>}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="mt-space-sm flex h-14 w-full items-center justify-center rounded-xl bg-primary text-body-lg font-body-lg font-semibold text-on-primary shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
                        >
                            {submitting ? "Sending…" : "Send reset code"}
                        </button>
                    </form>

                    <Link to="/login" className="mt-space-lg text-label-md font-label-md text-primary hover:underline">
                        Back to sign in
                    </Link>
                </div>
            </main>
        </div>
    );
}
