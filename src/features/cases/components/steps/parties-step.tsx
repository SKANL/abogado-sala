"use client";

import { useCaseWizard } from "../../store/use-case-wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash, UserSearch } from "lucide-react";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROLES_PREDETERMINADOS = [
  { label: "Demandante", value: "Demandante" },
  { label: "Demandado", value: "Demandado" },
  { label: "Denunciante", value: "Denunciante" },
  { label: "Acusado", value: "Acusado" },
  { label: "Víctima", value: "Víctima" },
  { label: "Testigo", value: "Testigo" },
  { label: "Perito", value: "Perito" },
  { label: "Aval", value: "Aval" },
];

export function PartiesStep({ clients = [], preselectedClientId }: { clients?: any[], preselectedClientId?: string }) {
    const { parties, addParty, updateParty, removeParty } = useCaseWizard();

    const handleAddParty = () => {
        addParty({
            id: Date.now().toString(),
            fullName: "",
            role: "",
            customFields: {}
        });
    }

    const clientOptions = clients.map(c => ({ label: c.full_name, value: c.full_name }));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Partes Involucradas</h3>
                <Button onClick={handleAddParty} size="sm">
                    <Plus className="w-4 h-4 mr-2" /> Agregar Nueva Parte
                </Button>
            </div>

            <div className="space-y-4">
                {parties.map((party, index) => (
                    <Card key={party.id}>
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm flex justify-between">
                                <span className="flex items-center gap-2"><UserSearch className="w-4 h-4"/> Parte #{index + 1}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeParty(party.id)}>
                                    <Trash className="w-4 h-4" />
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                            <div className="space-y-2 lg:col-span-2">
                                <Label>Búsqueda en Directorio / Nombre Libre</Label>
                                <CreatableCombobox 
                                    options={clientOptions}
                                    value={party.fullName || ""}
                                    onChange={(val) => updateParty(party.id, { fullName: val })}
                                    placeholder="Buscar por nombre o ingresar entidad"
                                    emptyMessage="Cliente no encontrado en directorio."
                                />
                            </div>
                            <div className="space-y-2 lg:col-span-1">
                                <Label>Rol en el Expediente</Label>
                                <CreatableCombobox 
                                    options={ROLES_PREDETERMINADOS}
                                    value={party.role || ""}
                                    onChange={(val) => updateParty(party.id, { role: val })}
                                    placeholder="Ej. Demandante, Acusado..."
                                    emptyMessage="Rol no encontrado."
                                />
                            </div>
                            
                            {/* Datos Generales */}
                            <div className="space-y-2">
                                <Label>Edad (opcional)</Label>
                                <Input 
                                    type="number"
                                    placeholder="Ej. 35" 
                                    value={party.age || ""}
                                    onChange={(e) => updateParty(party.id, { age: parseInt(e.target.value) || undefined })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Ocupación</Label>
                                <Input 
                                    placeholder="Ej. Comerciante" 
                                    value={party.occupation || ""}
                                    onChange={(e) => updateParty(party.id, { occupation: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Estado Civil</Label>
                                <Input 
                                    placeholder="Ej. Soltero/a" 
                                    value={party.maritalStatus || ""}
                                    onChange={(e) => updateParty(party.id, { maritalStatus: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 lg:col-span-3">
                                <Label>Dirección</Label>
                                <Input 
                                    placeholder="Calle, Número, Colonia, Ciudad..." 
                                    value={party.address || ""}
                                    onChange={(e) => updateParty(party.id, { address: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 lg:col-span-3">
                                <Label>Campos Personalizados (Extra info)</Label>
                                <Input 
                                    placeholder="Ej. {'pasaporte': 'X'}" 
                                    value={Object.keys(party.customFields || {}).length > 0 ? JSON.stringify(party.customFields) : ""}
                                    onChange={(e) => {
                                        try {
                                            const parsed = JSON.parse(e.target.value);
                                            updateParty(party.id, { customFields: parsed });
                                        } catch(err) {
                                            // Ignorar hasta que sea válido JSON
                                        }
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            {parties.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                    Agrega la primera parte o cliente del trámite.
                </div>
            )}
        </div>
    );
}
