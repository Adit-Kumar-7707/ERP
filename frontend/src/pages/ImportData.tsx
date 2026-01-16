import { useState } from "react";
import api from "@/api/client";
import { useNavigate } from "react-router-dom";

export default function ImportData() {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [results, setResults] = useState<any>(null);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async () => {
        if (!file) return alert("Select a CSV file first.");

        const formData = new FormData();
        formData.append("file", file);

        setUploading(true);
        try {
            // Note: Content-Type header is handled by browser/axios automatically when FormData is passed
            const res = await api.post("/impex/import-ledgers", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setResults(res.data);
        } catch (e: any) {
            alert("Upload Failed: " + (e.response?.data?.detail || e.message));
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = () => {
        const headers = "Name,Group,Opening Balance,Opening Type,GSTIN,State,Address\n";
        const example = "My Customer,Sundry Debtors,1000,Dr,29ABCDE1234F1Z5,Karnataka,Bangalore\n";
        const blob = new Blob([headers + example], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ledger_import_template.csv";
        a.click();
    };

    return (
        <div className="flex flex-col h-full bg-white font-mono text-sm max-w-4xl mx-auto border shadow my-4">
            <div className="bg-tally-blue text-white p-2 text-center font-bold text-lg">
                Import Data: Ledgers (CSV)
            </div>

            <div className="p-8 flex flex-col items-center gap-6">
                <div className="bg-yellow-50 p-4 border border-yellow-200 rounded text-center w-full">
                    <p className="font-bold mb-2">Instructions</p>
                    <ul className="text-left list-disc pl-6 space-y-1">
                        <li>File must be in <strong>.csv</strong> format.</li>
                        <li>Columns Required: <strong>Name, Group</strong>.</li>
                        <li>Columns Optional: Opening Balance, Opening Type (Dr/Cr), GSTIN, State, Address.</li>
                        <li>Group Name must match exactly with existing Tally Groups (e.g. "Sundry Debtors").</li>
                    </ul>
                    <button
                        onClick={downloadTemplate}
                        className="mt-4 text-blue-600 underline hover:text-blue-800"
                    >
                        Download Sample Template
                    </button>
                </div>

                <div className="w-full flex gap-4 items-center justify-center border-t py-6">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                        className="border p-2 bg-gray-50"
                    />
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="bg-tally-green text-white px-6 py-2 font-bold hover:bg-green-700 disabled:opacity-50"
                    >
                        {uploading ? "Importing..." : "Start Import"}
                    </button>
                </div>

                {results && (
                    <div className="w-full border-t py-4">
                        <div className="text-lg font-bold mb-2">Result:</div>
                        <div className="flex gap-4 mb-4">
                            <div className="px-4 py-2 bg-green-100 text-green-800 rounded font-bold">
                                Imported: {results.imported}
                            </div>
                            <div className="px-4 py-2 bg-red-100 text-red-800 rounded font-bold">
                                Errors: {results.errors.length}
                            </div>
                        </div>

                        {results.errors.length > 0 && (
                            <div className="bg-red-50 p-4 border border-red-200 h-64 overflow-auto font-mono text-xs">
                                {results.errors.map((err: string, i: number) => (
                                    <div key={i} className="text-red-700">{err}</div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-tally-bg border-t p-1 text-xs text-center text-tally-muted mt-auto">
                <button onClick={() => navigate("/")} className="hover:text-black hover:underline">[Esc] Quit</button>
            </div>
        </div>
    );
}
