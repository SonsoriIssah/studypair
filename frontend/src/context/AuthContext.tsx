import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import {
    ApiError,
    clearToken,
    fetchMe,
    getToken,
    loginWithEmail,
    registerWithEmail,
    setToken,
    startGoogleLogin,
    verifyEmail,
} from "../lib/api";
import type { User } from "../types";

interface AuthContextValue {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: () => void;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (
        email: string,
        password: string,
        confirmPassword: string,
        fullName: string
    ) => Promise<void>;
    completeEmailVerification: (email: string, code: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const LOCAL_EMAIL_KEY = "studypair_local_email";
const LOCAL_NAME_KEY = "studypair_local_name";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = async () => {
        const storedEmail = sessionStorage.getItem(LOCAL_EMAIL_KEY);

        if (!getToken()) {
            setUser(null);
            setIsLoading(false);
            return;
        }

        try {
            const me = await fetchMe();
            setUser(me);
            if (storedEmail) {
                sessionStorage.setItem(LOCAL_EMAIL_KEY, me.email);
            }
            if (me.full_name) {
                sessionStorage.setItem(LOCAL_NAME_KEY, me.full_name);
            }
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                clearToken();
                sessionStorage.removeItem(LOCAL_EMAIL_KEY);
                sessionStorage.removeItem(LOCAL_NAME_KEY);
                setUser(null);
            } else if (storedEmail) {
                setUser(null);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const signInWithEmail = async (email: string, password: string) => {
        const normalizedEmail = email.trim().toLowerCase();
        const trimmedPassword = password.trim();

        if (!normalizedEmail || !trimmedPassword) {
            throw new Error("Please enter both your email and password.");
        }

        const token = await loginWithEmail(normalizedEmail, trimmedPassword);
        setToken(token);
        sessionStorage.setItem(LOCAL_EMAIL_KEY, normalizedEmail);
        await refreshUser();
    };

    const signUpWithEmail = async (
        email: string,
        password: string,
        confirmPassword: string,
        fullName: string
    ) => {
        const normalizedEmail = email.trim().toLowerCase();
        const trimmedPassword = password.trim();
        const trimmedName = fullName.trim();

        if (!normalizedEmail || !trimmedPassword) {
            throw new Error("Please enter both your email and password.");
        }
        if (trimmedPassword.length < 8) {
            throw new Error("Password must be at least 8 characters long.");
        }
        if (!trimmedName) {
            throw new Error("Please enter your full name.");
        }
        if (trimmedPassword !== confirmPassword.trim()) {
            throw new Error("Passwords do not match.");
        }

        // No token yet — registering only sends a verification code. The
        // caller navigates to the verify-email screen next.
        await registerWithEmail(normalizedEmail, trimmedPassword, confirmPassword.trim(), trimmedName);
    };

    const completeEmailVerification = async (email: string, code: string) => {
        const normalizedEmail = email.trim().toLowerCase();
        const trimmedCode = code.trim();
        if (!trimmedCode) {
            throw new Error("Please enter the code from your email.");
        }

        const token = await verifyEmail(normalizedEmail, trimmedCode);
        setToken(token);
        sessionStorage.setItem(LOCAL_EMAIL_KEY, normalizedEmail);
        await refreshUser();
    };

    const logout = () => {
        clearToken();
        sessionStorage.removeItem(LOCAL_EMAIL_KEY);
        sessionStorage.removeItem(LOCAL_NAME_KEY);
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login: startGoogleLogin,
                signInWithEmail,
                signUpWithEmail,
                completeEmailVerification,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
}
