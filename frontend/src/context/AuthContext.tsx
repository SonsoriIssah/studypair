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
    initiateRegistration,
    loginWithEmail,
    setToken,
    startGoogleLogin,
    verifyRegistration,
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
        fullName: string,
        verificationCode?: string
    ) => Promise<void>;
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
        const storedName = sessionStorage.getItem(LOCAL_NAME_KEY);

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

    const authenticateWithEmail = async (
        email: string,
        password: string,
        confirmPassword?: string,
        fullName?: string,
        verificationCode?: string
    ) => {
        const normalizedEmail = email.trim().toLowerCase();
        const trimmedPassword = password.trim();
        const trimmedName = fullName?.trim();

        if (!normalizedEmail || !trimmedPassword) {
            throw new Error("Please enter both your email and password.");
        }

        if (trimmedPassword.length < 8) {
            throw new Error("Password must be at least 8 characters long.");
        }

        if (!trimmedName && fullName !== undefined) {
            throw new Error("Please enter your full name.");
        }

        if (fullName !== undefined) {
            if (!confirmPassword || confirmPassword.trim().length < 8) {
                throw new Error("Please confirm your password.");
            }
            if (trimmedPassword !== confirmPassword.trim()) {
                throw new Error("Passwords do not match.");
            }
        }

        let token = "";
        if (fullName === undefined) {
            token = await loginWithEmail(normalizedEmail, trimmedPassword);
        } else if (verificationCode) {
            token = await verifyRegistration(normalizedEmail, verificationCode);
        } else {
            await initiateRegistration(
                normalizedEmail,
                trimmedPassword,
                confirmPassword?.trim() ?? "",
                trimmedName ?? ""
            );
            throw new Error(
                "Verification code sent. Enter it to finish creating your account."
            );
        }

        setToken(token);
        sessionStorage.setItem(LOCAL_EMAIL_KEY, normalizedEmail);
        if (trimmedName) {
            sessionStorage.setItem(LOCAL_NAME_KEY, trimmedName);
        } else {
            sessionStorage.removeItem(LOCAL_NAME_KEY);
        }

        await refreshUser();
    };

    const signInWithEmail = async (email: string, password: string) => {
        await authenticateWithEmail(email, password);
    };

    const signUpWithEmail = async (
        email: string,
        password: string,
        confirmPassword: string,
        fullName: string,
        verificationCode?: string
    ) => {
        await authenticateWithEmail(
            email,
            password,
            confirmPassword,
            fullName,
            verificationCode
        );
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
