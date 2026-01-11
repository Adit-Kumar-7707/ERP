import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const useGlobalShortcuts = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if inside input/textarea
            if (
                ["INPUT", "TEXTAREA", "SELECT"].includes(
                    (e.target as HTMLElement).tagName
                )
            ) {
                return;
            }

            // Modifier keys check (avoid conflict)
            if (e.ctrlKey || e.altKey || e.metaKey) return;

            switch (e.key.toLowerCase()) {
                case "d":
                    navigate("/");
                    break;
                case "v":
                    // Default to Payment or last used?
                    navigate("/vouchers/payment");
                    break;
                case "l":
                    navigate("/ledgers");
                    break;
                case "i":
                    navigate("/inventory/items");
                    break;
                case "r":
                    navigate("/reports/trial-balance");
                    break;
                case "p":
                    navigate("/parties");
                    break;
                case "b":
                    navigate("/banking");
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate]);
};
