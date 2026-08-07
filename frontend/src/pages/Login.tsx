import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";

interface SignUpValues {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
}

interface SignInValues {
    email: string;
    password: string;
}

type Mode = "signin" | "signup";

const inputClass =
    "w-full h-12 px-space-md rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md font-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors";
const labelClass = "mb-1 block text-label-md font-label-md text-on-surface-variant";
const errorClass = "mt-1 text-body-sm font-body-sm text-error";

export default function Login() {
    const navigate = useNavigate();
    const { login, signInWithEmail, signUpWithEmail } = useAuth();

    const [mode, setMode] = useState<Mode>("signin");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const signInForm = useForm<SignInValues>({
        defaultValues: { email: "", password: "" },
    });

    const signUpForm = useForm<SignUpValues>({
        defaultValues: {
            fullName: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    const switchMode = (nextMode: Mode) => {
        setMode(nextMode);
        setError(null);
        signInForm.reset();
        signUpForm.reset();
    };

    const onSignIn = async (values: SignInValues) => {
        setError(null);
        setSubmitting(true);
        try {
            await signInWithEmail(values.email, values.password);
            navigate("/", { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not continue.");
        } finally {
            setSubmitting(false);
        }
    };

    const onSignUp = async (values: SignUpValues) => {
        setError(null);

        if (values.password !== values.confirmPassword) {
            signUpForm.setError("confirmPassword", {
                message: "Passwords do not match.",
            });
            return;
        }

        setSubmitting(true);
        try {
            await signUpWithEmail(
                values.email,
                values.password,
                values.confirmPassword,
                values.fullName
            );
            navigate("/", { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not continue.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-container-margin md:p-8">
            <main className="mx-auto w-full max-w-md">
                <div className="mb-space-xl text-center">
                    <div className="mb-space-lg flex h-20 w-20 items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-sm mx-auto">
                        <Icon name="school" filled className="text-[40px]" />
                    </div>

                    <h1 className="text-headline-lg font-headline-lg md:text-headline-xl md:font-headline-xl text-primary mb-space-xs">
                        StudyPair
                    </h1>
                    <p className="text-body-lg font-body-lg text-on-surface-variant mb-space-md">
                        Connect. Learn. Excel.
                    </p>
                    <p className="text-body-md font-body-md text-on-surface-variant mb-space-lg">
                        Find peer tutors for your courses, book sessions in minutes, and
                        get the help you need to ace your semester.
                    </p>

                    <div className="mb-space-lg grid grid-cols-3 gap-space-sm text-left">
                        <div className="flex flex-col items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-space-sm text-center">
                            <Icon name="search" className="text-primary text-[24px]" />
                            <span className="text-label-sm font-label-sm text-on-surface-variant">
                                Find a tutor
                            </span>
                        </div>
                        <div className="flex flex-col items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-space-sm text-center">
                            <Icon name="event_available" className="text-primary text-[24px]" />
                            <span className="text-label-sm font-label-sm text-on-surface-variant">
                                Book a session
                            </span>
                        </div>
                        <div className="flex flex-col items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-space-sm text-center">
                            <Icon name="trending_up" className="text-primary text-[24px]" />
                            <span className="text-label-sm font-label-sm text-on-surface-variant">
                                Ace your courses
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center rounded-xl border border-outline-variant bg-surface-container-lowest p-space-xl text-center shadow-lg">
                    <div className="mb-space-lg grid w-full grid-cols-2 rounded-lg border border-outline-variant p-1">
                        <button
                            type="button"
                            onClick={() => switchMode("signin")}
                            className={`rounded-md px-3 py-2 text-label-md font-label-md transition-colors ${
                                mode === "signin"
                                    ? "bg-primary text-on-primary"
                                    : "text-on-surface-variant"
                            }`}
                        >
                            Sign in
                        </button>
                        <button
                            type="button"
                            onClick={() => switchMode("signup")}
                            className={`rounded-md px-3 py-2 text-label-md font-label-md transition-colors ${
                                mode === "signup"
                                    ? "bg-primary text-on-primary"
                                    : "text-on-surface-variant"
                            }`}
                        >
                            Create account
                        </button>
                    </div>

                    {mode === "signin" && (
                        <form
                            onSubmit={signInForm.handleSubmit(onSignIn)}
                            className="w-full space-y-space-sm text-left"
                        >
                            <div>
                                <label className={labelClass}>Email</label>
                                <input
                                    type="email"
                                    {...signInForm.register("email", {
                                        required: "Please enter your email address.",
                                        pattern: {
                                            value: /.+@.+\..+/,
                                            message: "Please enter a valid email.",
                                        },
                                    })}
                                    placeholder="you@example.com"
                                    className={inputClass}
                                />
                                {signInForm.formState.errors.email && (
                                    <p className={errorClass}>
                                        {signInForm.formState.errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className={labelClass}>Password</label>
                                <input
                                    type="password"
                                    {...signInForm.register("password", {
                                        required: "Please enter your password.",
                                    })}
                                    placeholder="Your password"
                                    className={inputClass}
                                />
                                {signInForm.formState.errors.password && (
                                    <p className={errorClass}>
                                        {signInForm.formState.errors.password.message}
                                    </p>
                                )}
                            </div>

                            {error && <p className={errorClass}>{error}</p>}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="mt-space-sm flex h-14 w-full items-center justify-center rounded-xl bg-primary text-body-lg font-body-lg font-semibold text-on-primary shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
                            >
                                {submitting ? "Please wait…" : "Sign in"}
                            </button>
                        </form>
                    )}

                    {mode === "signup" && (
                        <form
                            onSubmit={signUpForm.handleSubmit(onSignUp)}
                            className="w-full space-y-space-sm text-left"
                        >
                            <div>
                                <label className={labelClass}>Full name</label>
                                <input
                                    {...signUpForm.register("fullName", {
                                        required: "Please enter your full name.",
                                    })}
                                    placeholder="Ada Lovelace"
                                    className={inputClass}
                                />
                                {signUpForm.formState.errors.fullName && (
                                    <p className={errorClass}>
                                        {signUpForm.formState.errors.fullName.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className={labelClass}>Email</label>
                                <input
                                    type="email"
                                    {...signUpForm.register("email", {
                                        required: "Please enter your email address.",
                                        pattern: {
                                            value: /.+@.+\..+/,
                                            message: "Please enter a valid email.",
                                        },
                                    })}
                                    placeholder="you@example.com"
                                    className={inputClass}
                                />
                                {signUpForm.formState.errors.email && (
                                    <p className={errorClass}>
                                        {signUpForm.formState.errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className={labelClass}>Password</label>
                                <input
                                    type="password"
                                    {...signUpForm.register("password", {
                                        required: "Please enter your password.",
                                        minLength: {
                                            value: 8,
                                            message:
                                                "Password must be at least 8 characters long.",
                                        },
                                        validate: (value) =>
                                            (/[A-Z]/.test(value) &&
                                                /[a-z]/.test(value) &&
                                                /\d/.test(value)) ||
                                            "Password must include upper and lower case letters and at least one number.",
                                    })}
                                    placeholder="At least 8 characters"
                                    className={inputClass}
                                />
                                {signUpForm.formState.errors.password && (
                                    <p className={errorClass}>
                                        {signUpForm.formState.errors.password.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className={labelClass}>Confirm password</label>
                                <input
                                    type="password"
                                    {...signUpForm.register("confirmPassword", {
                                        required: "Please confirm your password.",
                                    })}
                                    placeholder="Repeat your password"
                                    className={inputClass}
                                />
                                {signUpForm.formState.errors.confirmPassword && (
                                    <p className={errorClass}>
                                        {signUpForm.formState.errors.confirmPassword.message}
                                    </p>
                                )}
                            </div>

                            {error && <p className={errorClass}>{error}</p>}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="mt-space-sm flex h-14 w-full items-center justify-center rounded-xl bg-primary text-body-lg font-body-lg font-semibold text-on-primary shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
                            >
                                {submitting ? "Please wait…" : "Create account"}
                            </button>
                        </form>
                    )}

                    <div className="my-space-lg flex w-full items-center gap-3 text-label-sm font-label-sm text-outline">
                        <span className="h-px flex-1 bg-outline-variant" />
                        OR
                        <span className="h-px flex-1 bg-outline-variant" />
                    </div>

                    <button
                        type="button"
                        onClick={login}
                        className="flex w-full items-center justify-center gap-space-sm rounded-lg border border-outline-variant bg-surface-container-highest px-6 py-4 text-body-md font-label-md text-on-surface transition-colors duration-200 hover:bg-surface-dim"
                    >
                        <svg className="h-6 w-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </button>
                </div>

                <p className="mt-space-lg text-center text-label-sm font-label-sm text-on-surface-variant">
                    By signing in, you agree to our Terms of Service and Privacy Policy.
                </p>
            </main>
        </div>
    );
}
