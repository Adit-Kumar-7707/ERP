import { useState, useEffect } from "react";
import api from "@/api/client";
import { useNavigate } from "react-router-dom";

export default function UserCreate() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        full_name: "",
        role: "operator" // Default
    });

    const handleSave = async () => {
        if (!formData.username || !formData.password) return alert("Username and Password Required");

        try {
            await api.post("/auth/users", formData);
            alert("User Created Successfully!");
            navigate(-1);
        } catch (e: any) {
            alert(e.response?.data?.detail || "Creation Failed");
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") navigate(-1);
            if ((e.ctrlKey || e.metaKey) && e.key === "a") {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate, formData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="flex h-full items-center justify-center bg-gray-100 font-mono">
            <div className="w-[600px] bg-tally-bg border shadow-lg flex flex-col min-h-[400px]">
                {/* Header */}
                <div className="bg-tally-blue text-white font-bold px-2 py-1 flex justify-between">
                    <span>User Creation (Admin Only)</span>
                </div>

                {/* Form */}
                <div className="p-8 flex flex-col gap-4 flex-1">
                    <div className="flex gap-4 items-center">
                        <label className="w-32 font-bold">Username</label>
                        <input
                            name="username"
                            className="bg-black text-white p-1 outline-none w-full border border-gray-600 focus:bg-yellow-100 focus:text-black"
                            value={formData.username}
                            onChange={handleChange}
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-4 items-center">
                        <label className="w-32 font-bold">Password</label>
                        <input
                            name="password"
                            type="password"
                            className="bg-white text-black p-1 outline-none w-full border border-gray-400"
                            value={formData.password}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="flex gap-4 items-center">
                        <label className="w-32 font-bold">Full Name</label>
                        <input
                            name="full_name"
                            className="bg-white text-black p-1 outline-none w-full border border-gray-400"
                            value={formData.full_name}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="flex gap-4 items-center">
                        <label className="w-32 font-bold">Role</label>
                        <select
                            name="role"
                            className="bg-white text-black p-1 outline-none w-full border border-gray-400"
                            value={formData.role}
                            onChange={handleChange}
                        >
                            <option value="operator">Operator</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                </div>

                <div className="mt-auto bg-tally-bg border-t p-2 flex justify-between">
                    <button onClick={() => navigate(-1)} className="bg-red-600 text-white px-4 py-1 font-bold text-xs shadow-md">
                        Cancel (Esc)
                    </button>
                    <button onClick={handleSave} className="bg-tally-blue text-white px-4 py-1 font-bold text-xs shadow-md">
                        Accept (Yes)
                    </button>
                </div>
            </div>
        </div>
    );
}
