'use client';

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const initialContracts = {
  termoGarantia: "",
  termoContrato: "",
  reservaDominio: "",
  instrumentoLiberacao: "",
};

const ContractPage = () => {
  const [contracts, setContracts] = useState(initialContracts);
  const [selectedContract, setSelectedContract] = useState<keyof typeof contracts>("instrumentoLiberacao");
  const [isEditing, setIsEditing] = useState(false); // controla se está editando

  const handleSave = () => {
    localStorage.setItem("contracts", JSON.stringify(contracts));
    toast.success("Contrato salvo com sucesso!", {
      description: `O contrato "${selectedContract}" foi atualizado.`,
    });
    setIsEditing(false); // sai do modo de edição
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Editar Contratos</h1>

      <div className="mb-4 flex gap-4">
        {Object.keys(contracts).map((key) => (
          <Button
            key={key}
            variant={selectedContract === key ? "default" : "outline"}
            onClick={() => {
              setSelectedContract(key as keyof typeof contracts);
              setIsEditing(false); // só entra em edição quando clicar em "Editar"
            }}
          >
            {key === "termoGarantia"
              ? "Termo de Garantia"
              : key === "termoContrato"
              ? "Termo de Contrato Loja"
              : key === "reservaDominio"
              ? "Reserva de Domínio"
              : "Instrumento de Liberação"}
          </Button>
        ))}
      </div>

      {!isEditing && (
        <Button
          onClick={() => setIsEditing(true)}
          className="mb-4 bg-black text-white"
        >
          Editar Contrato
        </Button>
      )}

      {isEditing && (
        <>
          <textarea
            value={contracts[selectedContract]}
            onChange={(e) =>
              setContracts({ ...contracts, [selectedContract]: e.target.value })
            }
            className="w-full h-[400px] p-4 border rounded-md mb-4"
          />

          <Button
            onClick={handleSave}
            className="bg-black text-white"
          >
            Salvar Contrato
          </Button>
        </>
      )}
    </div>
  );
};

export default ContractPage;
