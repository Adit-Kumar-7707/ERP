import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import api from "@/api/client";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

interface User {
    username: string;
    sub: string;
}

interface AuthContextType {
    user: User | null;
    login: (token: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const navigate = useNavigate();

    // Check Token on Mount
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                // Check expiry
                if (decoded.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    setUser({ username: decoded.sub, sub: decoded.sub });
                    // Set default header
                    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
                }
            } catch (e) {
                logout();
            }
        }
    }, [navigate]);

    const login = (token: string) => {
        localStorage.setItem("token", token);
        const decoded: any = jwtDecode(token);
        setUser({ username: decoded.sub, sub: decoded.sub });
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        navigate("/");
    };

    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
        delete api.defaults.headers.common["Authorization"];
        navigate("/login");
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
}
