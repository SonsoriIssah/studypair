import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
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

interface VerifyValues {
    verificationCode: string;
}

type Mode = "signin" | "signup";
type SignupStep = "details" | "verify";

// Our AuthContext's signUpWithEmail throws instead of resolving when it
// wants the caller to collect a verification code — this checks for that
// specific case so we can treat it as "move to the next step" rather than
// a real failure. Adjust the match below if the wording ever changes.
function isVerificationRequired(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    return /verification code sent/i.test(err.message);
}

export default function Login() {
    const navigate = useNavigate();
    const { login, signInWithEmail, signUpWithEmail } = useAuth();

    const [mode, setMode] = useState<Mode>("signin");
    const [signupStep, setSignupStep] = useState<SignupStep>("details");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Holds the signup details entered in step 1, so step 2 (verification)
    // can complete the signup without asking the user to retype everything.
    const [pendingSignup, setPendingSignup] = useState<SignUpValues | null>(
        null
    );

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

    const verifyForm = useForm<VerifyValues>({
        defaultValues: { verificationCode: "" },
    });

    const switchMode = (nextMode: Mode) => {
        setMode(nextMode);
        setSignupStep("details");
        setPendingSignup(null);
        setError(null);
        signInForm.reset();
        signUpForm.reset();
        verifyForm.reset();
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

    // Step 1 of signup: submit account details. On success we always move
    // to the verification step ourselves — we don't depend on
    // signUpWithEmail's return value or on it *not* throwing, since some
    // backends throw a "verification required" style error here. If it
    // throws anything else (e.g. "email already in use"), that's a real
    // failure and we stay on this step and show it.
    const onSignUpDetails = async (values: SignUpValues) => {
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
            // Reaching this line means the request succeeded outright
            // (no verification step needed by this backend path).
            setPendingSignup(values);
            setSignupStep("verify");
        } catch (err) {
            if (isVerificationRequired(err)) {
                // Our AuthContext signals "code sent, call me again with
                // it" by throwing rather than resolving. Treat that as a
                // step forward, not a failure.
                setPendingSignup(values);
                setSignupStep("verify");
            } else {
                setError(
                    err instanceof Error ? err.message : "Could not continue."
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Step 2 of signup: submit the verification code using the details
    // captured in step 1.
    const onVerify = async (values: VerifyValues) => {
        if (!pendingSignup) {
            setError("Something went wrong. Please start sign up again.");
            setSignupStep("details");
            return;
        }

        setError(null);
        setSubmitting(true);
        try {
            await signUpWithEmail(
                pendingSignup.email,
                pendingSignup.password,
                pendingSignup.confirmPassword,
                pendingSignup.fullName,
                values.verificationCode
            );
            navigate("/", { replace: true });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "That code didn't work. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const onResend = async () => {
        if (!pendingSignup) return;
        setError(null);
        setSubmitting(true);
        try {
            await signUpWithEmail(
                pendingSignup.email,
                pendingSignup.password,
                pendingSignup.confirmPassword,
                pendingSignup.fullName
            );
        } catch (err) {
            if (!isVerificationRequired(err)) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Could not resend the code."
                );
            }
            // If it IS the "verification required" throw, that's expected
            // here too — it just means a new code was sent successfully.
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h1 className="text-2xl font-semibold text-slate-900">
                    StudyPair
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                    Find and book peer tutors at your university.
                </p>

                <div className="mt-6 grid grid-cols-2 rounded-lg border border-slate-200 p-1">
                    <button
                        type="button"
                        onClick={() => switchMode("signin")}
                        className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                            mode === "signin"
                                ? "bg-teal-600 text-white"
                                : "text-slate-600"
                        }`}
                    >
                        Sign in
                    </button>
                    <button
                        type="button"
                        onClick={() => switchMode("signup")}
                        className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                            mode === "signup"
                                ? "bg-teal-600 text-white"
                                : "text-slate-600"
                        }`}
                    >
                        Create account
                    </button>
                </div>

                {mode === "signin" && (
                    <form
                        onSubmit={signInForm.handleSubmit(onSignIn)}
                        className="mt-6 space-y-3"
                    >
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Email
                            </label>
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
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                            {signInForm.formState.errors.email && (
                                <p className="mt-1 text-xs text-red-600">
                                    {signInForm.formState.errors.email.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Password
                            </label>
                            <input
                                type="password"
                                {...signInForm.register("password", {
                                    required: "Please enter your password.",
                                })}
                                placeholder="Your password"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                            {signInForm.formState.errors.password && (
                                <p className="mt-1 text-xs text-red-600">
                                    {signInForm.formState.errors.password.message}
                                </p>
                            )}
                        </div>

                        {error && <p className="text-sm text-red-600">{error}</p>}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-60"
                        >
                            {submitting ? "Please wait…" : "Sign in"}
                        </button>
                    </form>
                )}

                {mode === "signup" && signupStep === "details" && (
                    <form
                        onSubmit={signUpForm.handleSubmit(onSignUpDetails)}
                        className="mt-6 space-y-3"
                    >
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Full name
                            </label>
                            <input
                                {...signUpForm.register("fullName", {
                                    required: "Please enter your full name.",
                                })}
                                placeholder="Ada Lovelace"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                            {signUpForm.formState.errors.fullName && (
                                <p className="mt-1 text-xs text-red-600">
                                    {signUpForm.formState.errors.fullName.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Email
                            </label>
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
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                            {signUpForm.formState.errors.email && (
                                <p className="mt-1 text-xs text-red-600">
                                    {signUpForm.formState.errors.email.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Password
                            </label>
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
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                            {signUpForm.formState.errors.password && (
                                <p className="mt-1 text-xs text-red-600">
                                    {signUpForm.formState.errors.password.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Confirm password
                            </label>
                            <input
                                type="password"
                                {...signUpForm.register("confirmPassword", {
                                    required: "Please confirm your password.",
                                })}
                                placeholder="Repeat your password"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                            {signUpForm.formState.errors.confirmPassword && (
                                <p className="mt-1 text-xs text-red-600">
                                    {signUpForm.formState.errors.confirmPassword.message}
                                </p>
                            )}
                        </div>

                        {error && <p className="text-sm text-red-600">{error}</p>}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-60"
                        >
                            {submitting ? "Please wait…" : "Create account"}
                        </button>
                    </form>
                )}

                {mode === "signup" && signupStep === "verify" && (
                    <form
                        onSubmit={verifyForm.handleSubmit(onVerify)}
                        className="mt-6 space-y-3"
                    >
                        <p className="text-sm text-slate-600">
                            We sent a verification code to{" "}
                            <span className="font-medium text-slate-900">
                                {pendingSignup?.email}
                            </span>
                            . Enter it below to finish creating your account.
                        </p>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Verification code
                            </label>
                            <input
                                {...verifyForm.register("verificationCode", {
                                    required: "Please enter the code we sent you.",
                                })}
                                placeholder="Enter the 6-digit code"
                                autoFocus
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                            {verifyForm.formState.errors.verificationCode && (
                                <p className="mt-1 text-xs text-red-600">
                                    {
                                        verifyForm.formState.errors.verificationCode
                                            .message
                                    }
                                </p>
                            )}
                        </div>

                        {error && <p className="text-sm text-red-600">{error}</p>}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-60"
                        >
                            {submitting ? "Please wait…" : "Verify account"}
                        </button>

                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <button
                                type="button"
                                onClick={() => {
                                    setSignupStep("details");
                                    setError(null);
                                }}
                                className="underline hover:text-slate-700"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={onResend}
                                disabled={submitting}
                                className="underline hover:text-slate-700 disabled:opacity-60"
                            >
                                Resend code
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}