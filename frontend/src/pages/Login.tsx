import { useState } from "react";
import api from "@/api/client";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
    const { login } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // OAuth2PasswordRequestForm expects form-data, not JSON
            const formData = new FormData();
            formData.append("username", username);
            formData.append("password", password);

            const res = await api.post("/auth/token", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            login(res.data.access_token);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Login Failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-tally-bg flex items-center justify-center">
            <div className="bg-white p-8 shadow-lg border-2 border-tally-yellow w-96">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-tally-blue">Accounting OS</h1>
                    <p className="text-gray-500 text-sm">Sign in to continue</p>
                </div>

                {error && <div className="bg-red-100 text-red-700 p-2 mb-4 text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700">Username</label>
                        <input
                            className="w-full border p-2 focus:border-tally-blue outline-none"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700">Password</label>
                        <input
                            type="password"
                            className="w-full border p-2 focus:border-tally-blue outline-none"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-tally-green text-white font-bold py-2 mt-2 hover:bg-green-700 disabled:opacity-50"
                    >
                        {loading ? "Verifying..." : "Login"}
                    </button>

                    <div className="text-xs text-center text-gray-400 mt-4">
                        Default: admin / admin
                    </div>
                </form>
            </div>
        </div>
    );
}
