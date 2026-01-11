import React, { createContext, useContext, useState, useEffect } from "react";
import api from "@/api/client";

interface OrganizationFeatures {
    inventory: boolean;
    gst: boolean;
    cost_centers: boolean;
    multi_currency: boolean;
}

interface Organization {
    id: number;
    name: string;
    features: OrganizationFeatures;
    currency_symbol: string;
}

interface OrganizationContextType {
    organization: Organization | null;
    loading: boolean;
    refreshOrganization: () => Promise<void>;
    hasFeature: (feature: keyof OrganizationFeatures) => boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshOrganization = async () => {
        try {
            const res = await api.get("/organization/");
            // Normalize features
            const rawFeatures = res.data.features || {};
            const features: OrganizationFeatures = {
                inventory: !!rawFeatures.inventory,
                gst: !!rawFeatures.gst,
                cost_centers: !!rawFeatures.cost_centers,
                multi_currency: !!rawFeatures.multi_currency,
            };

            setOrganization({
                ...res.data,
                features
            });
        } catch (error) {
            console.error("Failed to fetch organization config", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshOrganization();
    }, []);

    const hasFeature = (feature: keyof OrganizationFeatures) => {
        if (!organization) return false;
        return !!organization.features[feature];
    };

    return (
        <OrganizationContext.Provider value={{ organization, loading, refreshOrganization, hasFeature }}>
            {children}
        </OrganizationContext.Provider>
    );
};

export const useOrganization = () => {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error("useOrganization must be used within an OrganizationProvider");
    }
    return context;
};
