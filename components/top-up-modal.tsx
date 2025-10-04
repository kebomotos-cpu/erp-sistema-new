"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2 } from "lucide-react"

const steps = ["Valor", "Detalhes do Cartão", "Verificação OTP", "Confirmação"]

export function TopUpModal({ isOpen, onClose, onTopUp }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [amount, setAmount] = useState("")
  const [cardDetails, setCardDetails] = useState({ number: "", expiry: "", cvv: "" })
  const [otp, setOtp] = useState("")

  const handleContinue = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onTopUp(Number.parseFloat(amount))
      onClose()
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <Label htmlFor="amount">Valor para adicionar</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Digite o valor"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        )
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Número do cartão</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardDetails.number}
                onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Data de validade</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  value={cardDetails.expiry}
                  onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  value={cardDetails.cvv}
                  onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                />
              </div>
            </div>
          </div>
        )
      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Digite o OTP enviado para o seu número de celular cadastrado</p>
            <Input placeholder="Digite o OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
          </div>
        )
      case 3:
        return (
          <div className="text-center space-y-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <p className="text-lg font-medium">Recarga concluída</p>
            <p className="text-sm text-muted-foreground">R$ {amount} foram adicionados à sua conta.</p>
          </div>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{steps[currentStep]}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {renderStepContent()}
          <div className="flex justify-between">
            {currentStep > 0 && currentStep < steps.length - 1 && (
              <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                Voltar
              </Button>
            )}
            <Button onClick={handleContinue} className="ml-auto">
              {currentStep === steps.length - 1 ? "Fechar" : "Continuar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
