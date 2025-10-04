"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/firebase/config"
import { toast } from "sonner"

type ContractKeys =
  | "termoEntrega"
  | "termoContrato"
  | "reservaDominio"
  | "instrumentoLiberacao"
  | "vendaRepasse"

const defaultContracts: Record<ContractKeys, string> = {
  termoEntrega: "Modelo base - Contrato",
  termoContrato: "Modelo base - Termo de Entrega",
  reservaDominio: "Modelo base - Reserva de Domínio",
  instrumentoLiberacao: "Modelo base - Instrumento de Liberação",
  vendaRepasse: "Modelo base - Venda de Veículo de Repasse",
}

export default function ContractPage() {
  const [contracts, setContracts] = useState<Record<ContractKeys, string>>(defaultContracts)
  const [selectedContract, setSelectedContract] = useState<ContractKeys>("termoEntrega")
  const [isEditing, setIsEditing] = useState(false)

  // 🔥 Carrega modeloBase do Firestore
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const ref = doc(db, "contracts", "modeloBase")
        const snap = await getDoc(ref)

        if (snap.exists()) {
          const data = snap.data()
          // ✅ cast seguro e limpeza
          const cleanedData = Object.keys(defaultContracts).reduce((acc, key) => {
            const k = key as ContractKeys
            const val = data[k]
            acc[k] = val && typeof val === "string" && val.trim() !== ""
              ? val
              : defaultContracts[k]
            return acc
          }, {} as Record<ContractKeys, string>)

          setContracts(cleanedData)
        } else {
          await setDoc(ref, defaultContracts)
          toast.success("Modelo base criado no Firestore.")
        }
      } catch (err) {
        console.error(err)
        toast.error("Erro ao carregar contratos.")
      }
    }

    fetchContracts()
  }, [])

  // 💾 Salvar no Firestore
  const handleSave = async () => {
    try {
      const ref = doc(db, "contracts", "modeloBase")
      await setDoc(ref, contracts, { merge: true })
      toast.success("Contratos atualizados com sucesso!")
      setIsEditing(false)
    } catch (err) {
      console.error(err)
      toast.error("Erro ao salvar no Firestore.")
    }
  }

  const labelMap: Record<ContractKeys, string> = {
    termoEntrega: "Termo de Garantia / Entrega",
    termoContrato: "Contrato de Compra e Venda Loja",
    reservaDominio: "Reserva de Domínio",
    instrumentoLiberacao: "Instrumento de Liberação",
    vendaRepasse: "Venda de Veículo de Repasse",
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Editar Contratos</h1>

      <div className="mb-4 flex flex-wrap gap-3">
        {Object.keys(contracts).map((key) => {
          const k = key as ContractKeys
          return (
            <Button
              key={k}
              variant={selectedContract === k ? "default" : "outline"}
              onClick={() => {
                setSelectedContract(k)
                setIsEditing(false)
              }}
            >
              {labelMap[k]}
            </Button>
          )
        })}
      </div>

      {!isEditing && (
        <Button onClick={() => setIsEditing(true)} className="mb-4 bg-black text-white">
          Editar Contrato
        </Button>
      )}

      <textarea
        readOnly={!isEditing}
        value={contracts[selectedContract]}
        onChange={(e) =>
          setContracts({ ...contracts, [selectedContract]: e.target.value })
        }
        className={`w-full h-[600px] p-4 border rounded-md mb-4 text-sm leading-relaxed whitespace-pre-wrap ${
          !isEditing ? "bg-gray-100 cursor-default" : ""
        }`}
      />

      {isEditing && (
        <Button onClick={handleSave} className="bg-black text-white">
          Salvar no Firestore
        </Button>
      )}
    </div>
  )
}
