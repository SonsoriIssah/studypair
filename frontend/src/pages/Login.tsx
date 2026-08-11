import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";

interface SignUpValues {
    fullName: string;
    email: string;
    password: string;
}

interface SignInValues {
    email: string;
    password: string;
}

type Mode = "signin" | "signup";

const inputBaseClass =
    "w-full rounded-lg px-4 py-3 pr-12 bg-surface text-on-surface placeholder-on-surface-variant/50 focus:outline-none transition-all";
const inputDefaultClass =
    "border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary";
const labelClass = "px-1 font-label-sm text-label-sm text-on-surface-variant";
const errorClass = "mt-1 px-1 text-body-sm font-body-sm text-error";

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { signInWithEmail, signUpWithEmail } = useAuth();

    const [mode, setMode] = useState<Mode>(
        (location.state as { mode?: Mode } | null)?.mode === "signup" ? "signup" : "signin"
    );
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const signInForm = useForm<SignInValues>({
        defaultValues: { email: "", password: "" },
    });

    const signUpForm = useForm<SignUpValues>({
        defaultValues: { fullName: "", email: "", password: "" },
    });

    const switchMode = (nextMode: Mode) => {
        setMode(nextMode);
        setError(null);
        setShowPassword(false);
        signInForm.reset();
        signUpForm.reset();
    };

    const onSignIn = async (values: SignInValues) => {
        setError(null);
        setSubmitting(true);
        try {
            await signInWithEmail(values.email, values.password);
            navigate("/dashboard", { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not continue.");
        } finally {
            setSubmitting(false);
        }
    };

    const onSignUp = async (values: SignUpValues) => {
        setError(null);
        setSubmitting(true);
        try {
            // The visibility toggle lets users double-check what they typed,
            // so there's no separate confirm-password field to compare against.
            await signUpWithEmail(values.email, values.password, values.password, values.fullName);
            navigate("/dashboard", { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not continue.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-surface-container p-4 text-on-surface md:p-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm md:flex-row">
                {/* Left Panel - Brand */}
                <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-8 text-on-primary md:flex md:w-5/12 md:p-12">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-fixed to-transparent opacity-20" />

                    <div className="relative z-10 flex items-center gap-4">
                        {mode === "signin" ? (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface font-headline-md font-bold text-primary shadow-sm">
                                SP
                            </div>
                        ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-on-primary shadow-sm">
                                <Icon name="school" className="text-primary text-[28px]" />
                            </div>
                        )}
                        <div>
                            <h2 className="m-0 font-headline-md text-headline-md text-on-primary">StudyPair</h2>
                            <p className="m-0 font-label-sm text-label-sm text-primary-fixed-dim opacity-90">
                                Connect. Learn. Excel.
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 my-16 md:my-24">
                        <span className="mb-6 inline-block rounded-full bg-primary-fixed/20 px-3 py-1 font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed-dim">
                            Peer Tutoring Platform
                        </span>
                        <h1 className="mb-6 font-headline-xl text-headline-xl text-on-primary">
                            Study
                            <br />
                            Pair
                        </h1>
                        <p className="max-w-md font-body-lg text-body-lg text-primary-fixed-dim">
                            Connect with fellow students to excel in your courses. Completely free,
                            university-specific, and powered by peer support.
                        </p>
                    </div>

                    <div className="relative z-10 flex flex-wrap gap-3">
                        {mode === "signin" ? (
                            <>
                                <span className="flex items-center gap-2 rounded-full border border-primary-fixed/30 bg-primary-container/20 px-4 py-2 font-label-md text-label-md text-on-primary backdrop-blur-sm">
                                    <Icon name="school" className="text-[16px] text-primary-fixed" />
                                    Free for students
                                </span>
                                <span className="flex items-center gap-2 rounded-full border border-primary-fixed/30 bg-primary-container/20 px-4 py-2 font-label-md text-label-md text-on-primary backdrop-blur-sm">
                                    <Icon name="login" filled className="text-[16px] text-primary-fixed" />
                                    User Friendly
                                </span>
                                <span className="flex items-center gap-2 rounded-full border border-primary-fixed/30 bg-primary-container/20 px-4 py-2 font-label-md text-label-md text-on-primary backdrop-blur-sm">
                                    <Icon name="verified" filled className="text-[16px] text-primary-fixed" />
                                    University verified
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="flex items-center gap-2 rounded-full border border-primary-fixed/20 bg-primary-fixed/10 px-4 py-2 font-label-md text-label-md text-primary-fixed-dim">
                                    <Icon name="check_circle" className="text-[16px]" />
                                    Free for students
                                </span>
                                <span className="flex items-center gap-2 rounded-full border border-primary-fixed/20 bg-primary-fixed/10 px-4 py-2 font-label-md text-label-md text-primary-fixed-dim">
                                    <Icon name="thumb_up" className="text-[16px]" />
                                    User Friendly
                                </span>
                                <span className="flex items-center gap-2 rounded-full border border-primary-fixed/20 bg-primary-fixed/10 px-4 py-2 font-label-md text-label-md text-primary-fixed-dim">
                                    <Icon name="verified_user" className="text-[16px]" />
                                    University verified
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Panel - Form */}
                <div className="flex w-full flex-col justify-center overflow-y-auto bg-surface-container-lowest/95 p-8 backdrop-blur-md md:w-7/12 md:p-12 lg:p-16">
                    <div className="mx-auto w-full max-w-md">
                        {mode === "signin" ? (
                            <>
                                <div className="mb-space-lg flex h-12 w-12 items-center justify-center rounded-xl bg-primary font-headline-md font-bold text-on-primary shadow-sm md:hidden">
                                    SP
                                </div>

                                <div className="mb-space-xl flex w-full items-center gap-space-md">
                                    <div className="hidden h-12 w-12 items-center justify-center rounded-lg bg-primary font-headline-md font-bold text-on-primary shadow-sm md:flex">
                                        SP
                                    </div>
                                    <div>
                                        <h2 className="font-headline-lg text-headline-lg text-on-surface">Sign in</h2>
                                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                                            Peer tutoring, made simple
                                        </p>
                                    </div>
                                </div>

                                <form onSubmit={signInForm.handleSubmit(onSignIn)} className="mb-space-lg space-y-4">
                                    <div className="space-y-1">
                                        <label className={labelClass}>Email Address</label>
                                        <input
                                            type="email"
                                            {...signInForm.register("email", {
                                                required: "Please enter your email address.",
                                                pattern: { value: /.+@.+\..+/, message: "Please enter a valid email." },
                                            })}
                                            placeholder="you@example.com"
                                            className={`${inputBaseClass} ${inputDefaultClass}`}
                                        />
                                        {signInForm.formState.errors.email && (
                                            <p className={errorClass}>{signInForm.formState.errors.email.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <label className={labelClass}>Password</label>
                                        <div className="relative w-full">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                {...signInForm.register("password", {
                                                    required: "Please enter your password.",
                                                })}
                                                placeholder="Enter your password"
                                                className={`${inputBaseClass} ${inputDefaultClass}`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((v) => !v)}
                                                className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-on-surface-variant transition-colors hover:text-primary"
                                            >
                                                <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-[20px]" />
                                            </button>
                                        </div>
                                        {signInForm.formState.errors.password && (
                                            <p className={errorClass}>{signInForm.formState.errors.password.message}</p>
                                        )}
                                    </div>

                                    {error && <p className={errorClass}>{error}</p>}

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="mt-2 w-full rounded-lg bg-primary py-4 font-label-md text-label-md text-on-primary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                                    >
                                        {submitting ? "Please wait…" : "Sign In"}
                                    </button>
                                </form>

                                <div className="mb-space-lg flex w-full items-center justify-between font-label-sm text-label-sm">
                                    <a href="#" className="text-primary underline-offset-2 hover:underline">
                                        Forgot your password?
                                    </a>
                                    <a href="#" className="text-primary underline-offset-2 hover:underline">
                                        Privacy Policy
                                    </a>
                                </div>

                                <p className="mt-space-lg w-full text-center font-body-sm text-body-sm text-on-surface-variant">
                                    Don't have an account?{" "}
                                    <button
                                        type="button"
                                        onClick={() => switchMode("signup")}
                                        className="font-label-md text-label-md text-primary underline-offset-2 hover:underline"
                                    >
                                        Sign Up
                                    </button>
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="mb-10 text-center">
                                    <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                        <Icon name="account_circle" className="text-primary text-[28px]" />
                                    </div>
                                    <h2 className="mb-3 font-headline-lg text-headline-lg text-on-surface">
                                        Create your account
                                    </h2>
                                    <p className="font-body-md text-body-md text-on-surface-variant">
                                        Join the community of student tutors and learners.
                                    </p>
                                </div>

                                <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="mb-6 space-y-4">
                                    <div className="space-y-1">
                                        <label className={labelClass}>Full Name</label>
                                        <input
                                            {...signUpForm.register("fullName", {
                                                required: "Please enter your full name.",
                                            })}
                                            placeholder="Enter your full name"
                                            className={`${inputBaseClass} ${inputDefaultClass}`}
                                        />
                                        {signUpForm.formState.errors.fullName && (
                                            <p className={errorClass}>{signUpForm.formState.errors.fullName.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <label className={labelClass}>Email Address</label>
                                        <input
                                            type="email"
                                            {...signUpForm.register("email", {
                                                required: "Please enter your email address.",
                                                pattern: { value: /.+@.+\..+/, message: "Please enter a valid email." },
                                            })}
                                            placeholder="name@university.edu"
                                            className={`${inputBaseClass} ${inputDefaultClass}`}
                                        />
                                        {signUpForm.formState.errors.email && (
                                            <p className={errorClass}>{signUpForm.formState.errors.email.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <label className={labelClass}>Password</label>
                                        <div className="relative w-full">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                {...signUpForm.register("password", {
                                                    required: "Please enter your password.",
                                                    minLength: {
                                                        value: 8,
                                                        message: "Password must be at least 8 characters long.",
                                                    },
                                                    validate: (value) =>
                                                        (/[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value)) ||
                                                        "Password must include upper and lower case letters and at least one number.",
                                                })}
                                                placeholder="At least 8 characters"
                                                className={`${inputBaseClass} ${inputDefaultClass}`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((v) => !v)}
                                                className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-on-surface-variant transition-colors hover:text-primary"
                                            >
                                                <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-[20px]" />
                                            </button>
                                        </div>
                                        {signUpForm.formState.errors.password && (
                                            <p className={errorClass}>{signUpForm.formState.errors.password.message}</p>
                                        )}
                                    </div>

                                    {error && <p className={errorClass}>{error}</p>}

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="mt-2 w-full rounded-lg bg-primary py-4 font-label-md text-label-md text-on-primary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                                    >
                                        {submitting ? "Please wait…" : "Create Account"}
                                    </button>
                                </form>

                                <div className="space-y-6 text-center">
                                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                                        By continuing, you agree to StudyPair's{" "}
                                        <a href="#" className="text-primary hover:underline">
                                            Terms
                                        </a>{" "}
                                        and{" "}
                                        <a href="#" className="text-primary hover:underline">
                                            Privacy Policy
                                        </a>
                                        .
                                    </p>
                                    <div className="my-6 h-px w-full bg-outline-variant/30" />
                                    <p className="font-body-md text-body-md">
                                        Already have an account?{" "}
                                        <button
                                            type="button"
                                            onClick={() => switchMode("signin")}
                                            className="font-bold text-primary hover:underline"
                                        >
                                            Sign in
                                        </button>
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
