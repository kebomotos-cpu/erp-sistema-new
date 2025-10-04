"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

type Sale = {
  id: string
  date: string
  model: string
  clientName: string
  value: number
  downPayment: number
}

type SalesData = {
  label: string
  revenue: number
  profit: number
}

// Mock de vendas simulando dados reais
const mockSalesData: Sale[] = [
  {
    id: "1",
    date: "2025-09-10",
    model: "CG 160 Titan",
    clientName: "João Silva",
    value: 16500,
    downPayment: 3000,
  },
  {
    id: "2",
    date: "2025-09-15",
    model: "Biz 125 EX",
    clientName: "Maria Oliveira",
    value: 14800,
    downPayment: 2500,
  },
  {
    id: "3",
    date: "2025-09-25",
    model: "CB 300R",
    clientName: "Pedro Souza",
    value: 22000,
    downPayment: 4000,
  },
  {
    id: "4",
    date: "2025-10-01",
    model: "XRE 300 Rally",
    clientName: "Carlos Pereira",
    value: 28000,
    downPayment: 5000,
  },
  {
    id: "5",
    date: "2025-10-03",
    model: "NXR 160 Bros",
    clientName: "Lucas Andrade",
    value: 19500,
    downPayment: 3500,
  },
]

export default function Dashboard() {
  const [data, setData] = useState<SalesData[]>([])
  const [period, setPeriod] = useState<"week" | "month">("month")

  useEffect(() => {
    if (!mockSalesData.length) return

    const aggregated: Record<string, { revenue: number; profit: number }> = {}

    mockSalesData.forEach((sale) => {
      const dateObj = new Date(sale.date)
      let label = ""

      if (period === "month") {
        label = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`
      } else {
        const weekStart = new Date(dateObj)
        weekStart.setDate(dateObj.getDate() - dateObj.getDay())
        label = weekStart.toISOString().split("T")[0]
      }

      if (!aggregated[label]) aggregated[label] = { revenue: 0, profit: 0 }
      aggregated[label].revenue += sale.value
      aggregated[label].profit += sale.downPayment
    })

    const formatted: SalesData[] = Object.entries(aggregated)
      .map(([label, values]) => ({
        label,
        revenue: values.revenue,
        profit: values.profit,
      }))
      .sort((a, b) => (a.label > b.label ? 1 : -1))

    setData(formatted)
  }, [period])

  const totalRevenue = mockSalesData.reduce((sum, s) => sum + s.value, 0)
  const totalProfit = mockSalesData.reduce((sum, s) => sum + s.downPayment, 0)
  const totalSales = mockSalesData.length
  const avgTicket = totalSales ? totalRevenue / totalSales : 0

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Dashboard Financeiro</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Faturamento Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalRevenue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lucro Líquido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalProfit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(avgTicket)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalSales}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <button
          className={`px-3 py-1 rounded ${
            period === "week" ? "bg-orange-600 text-white" : "bg-muted"
          }`}
          onClick={() => setPeriod("week")}
        >
          Semana
        </button>
        <button
          className={`px-3 py-1 rounded ${
            period === "month" ? "bg-orange-600 text-white" : "bg-muted"
          }`}
          onClick={() => setPeriod("month")}
        >
          Mês
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolução {period === "month" ? "Mensal" : "Semanal"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => {
                    return new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(value)
                  }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#ea580c" name="Faturamento" />
                <Line type="monotone" dataKey="profit" stroke="#16a34a" name="Lucro Líquido" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas Vendas de Motos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Data</th>
                  <th className="p-2">Modelo</th>
                  <th className="p-2">Cliente</th>
                  <th className="p-2">Valor</th>
                  <th className="p-2">Entrada</th>
                </tr>
              </thead>
              <tbody>
                {mockSalesData
                  .slice(-10)
                  .reverse()
                  .map((sale) => (
                    <tr key={sale.id} className="border-b">
                      <td className="p-2">
                        {new Date(sale.date).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-2">{sale.model}</td>
                      <td className="p-2">{sale.clientName}</td>
                      <td className="p-2">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(sale.value)}
                      </td>
                      <td className="p-2 text-green-600">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(sale.downPayment)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
