import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api";

interface OrganizationData {
    id: number;
    name: string;
    country: string;
    state: string;
    pin_code?: string;
    gstin?: string;
    financial_year_start: string;
}

export default function CompanySettings() {
    const { register, handleSubmit, reset } = useForm<OrganizationData>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get("/accounting/organization")
            .then(res => {
                reset(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [reset]);

    const onSubmit = async (data: OrganizationData) => {
        setSaving(true);
        try {
            await api.put("/accounting/organization", data);
            alert("Settings Saved!");
        } catch (e) {
            alert("Error saving settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;

    return (
        <div className="h-full flex flex-col bg-tally-bg">
            <div className="bg-tally-blue text-white p-2 font-bold flex justify-between">
                <span>Company Settings (F11)</span>
                <span className="text-xs">Ctrl+A to Save</span>
            </div>

            <div className="flex-1 p-4 bg-white m-4 border shadow-sm max-w-2xl mx-auto overflow-auto">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 font-mono text-sm">
                    {/* Header Info */}
                    <div className="border-b pb-2 mb-4">
                        <h2 className="font-bold text-lg text-tally-blue">General Information</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block font-semibold mb-1">Company Name</label>
                            <input
                                {...register("name", { required: true })}
                                className="w-full border-b border-gray-300 outline-none focus:border-blue-500 py-1"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold mb-1">Financial Year From</label>
                            <input
                                {...register("financial_year_start")}
                                disabled
                                className="w-full border-b border-gray-300 bg-gray-50 text-gray-500 py-1"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block font-semibold mb-1">State</label>
                            <input
                                {...register("state", { required: true })}
                                className="w-full border-b border-gray-300 outline-none focus:border-blue-500 py-1"
                                placeholder="e.g. Karnataka"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold mb-1">Country</label>
                            <input
                                {...register("country")}
                                className="w-full border-b border-gray-300 outline-none focus:border-blue-500 py-1"
                            />
                        </div>
                    </div>

                    {/* Statutory Info */}
                    <div className="border-b pb-2 mt-6 mb-4">
                        <h2 className="font-bold text-lg text-tally-blue">Statutory Details (GST)</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block font-semibold mb-1">GSTIN / UIN</label>
                            <input
                                {...register("gstin")}
                                className="w-full border-b border-dashed border-gray-400 outline-none focus:border-blue-500 py-1 bg-yellow-50"
                                placeholder="29XXXXX..."
                            />
                        </div>
                        <div>
                            {/* Reg Type, etc. could go here */}
                            <label className="block font-semibold mb-1 text-gray-400">Registration Type</label>
                            <div className="text-gray-500">Regular (Default)</div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-tally-blue text-white px-6 py-2 font-bold hover:bg-blue-700 shadow-md"
                        >
                            {saving ? "Saving..." : "Accept (Save)"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
