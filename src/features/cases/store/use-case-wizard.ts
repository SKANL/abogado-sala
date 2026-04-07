import { create } from 'zustand';

export interface Party {
    id: string; // Puede ser un temporary ID o uno existente
    clientId?: string; // Si está vinculado a un cliente en DB
    fullName: string;
    role: string;
    // Datos generales
    age?: number;
    maritalStatus?: string;
    occupation?: string;
    education?: string;
    nationality?: string;
    address?: string;
    // Campos extra libre
    customFields: Record<string, string>;
}

export interface Testimony {
    id: string;
    personName: string;
    personDetails: string;
    declaration: string;
}

export interface EvidenceFile {
    id: string;
    fileUrl: string; // URL en Supabase si ya se subió temporalmente, o path local si usamos File object (mejor URLs si ya está en storage)
    name: string;
    label: string;
}

export interface CaseWizardState {
    currentStep: number;
    // Paso 1
    area: string;
    subject: string;
    authority: string;
    referenceId: string; // Identificador/Folio
    // Pasos 2 y 3
    parties: Party[];
    // Paso 4
    evidence: EvidenceFile[];
    testimonies: Testimony[];
    // Paso 5 (El documento/narrativa se arman al final, pero si el usuario teclea en un texto antes de llegar al doc final, se puede guardar aquí)
    narrative: string;
    documentType: string;

    // Actions
    setStep: (step: number) => void;
    nextStep: () => void;
    prevStep: () => void;
    
    // Setters
    setGeneralInfo: (info: { area?: string; subject?: string; authority?: string; referenceId?: string }) => void;
    addParty: (party: Party) => void;
    updateParty: (id: string, updates: Partial<Party>) => void;
    removeParty: (id: string) => void;

    addEvidence: (file: EvidenceFile) => void;
    updateEvidence: (id: string, updates: Partial<EvidenceFile>) => void;
    removeEvidence: (id: string) => void;

    addTestimony: (testimony: Testimony) => void;
    updateTestimony: (id: string, updates: Partial<Testimony>) => void;
    removeTestimony: (id: string) => void;

    setDocumentInfo: (info: { narrative?: string; documentType?: string }) => void;
    
    // Reset global para limpiar al terminar
    reset: () => void;
}

const initialState = {
    currentStep: 0,
    area: "",
    subject: "",
    authority: "",
    referenceId: "",
    parties: [],
    evidence: [],
    testimonies: [],
    narrative: "",
    documentType: "",
};

export const useCaseWizard = create<CaseWizardState>((set) => ({
    ...initialState,
    setStep: (step) => set({ currentStep: step }),
    nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) })),
    prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 0) })),

    setGeneralInfo: (info) => set((state) => ({ ...state, ...info })),
    
    addParty: (party) => set((state) => ({ parties: [...state.parties, party] })),
    updateParty: (id, updates) => set((state) => ({ 
        parties: state.parties.map(p => p.id === id ? { ...p, ...updates } : p) 
    })),
    removeParty: (id) => set((state) => ({ parties: state.parties.filter(p => p.id !== id) })),

    addEvidence: (evidence) => set((state) => ({ evidence: [...state.evidence, evidence] })),
    updateEvidence: (id, updates) => set((state) => ({
        evidence: state.evidence.map(e => e.id === id ? { ...e, ...updates } : e)
    })),
    removeEvidence: (id) => set((state) => ({ evidence: state.evidence.filter(e => e.id !== id) })),

    addTestimony: (testimony) => set((state) => ({ testimonies: [...state.testimonies, testimony] })),
    updateTestimony: (id, updates) => set((state) => ({
        testimonies: state.testimonies.map(t => t.id === id ? { ...t, ...updates } : t)
    })),
    removeTestimony: (id) => set((state) => ({ testimonies: state.testimonies.filter(t => t.id !== id) })),

    setDocumentInfo: (info) => set((state) => ({ ...state, ...info })),

    reset: () => set(initialState),
}));
