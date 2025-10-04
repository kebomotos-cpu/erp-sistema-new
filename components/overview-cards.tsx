import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Users, CreditCard, TrendingUp } from "lucide-react"
type ComparisonPeriod = "previous_month" | "previous_quarter" | "previous_year"

type OverviewCardsProps = {
  comparisonPeriod: ComparisonPeriod
}

export function OverviewCards({ comparisonPeriod }: OverviewCardsProps) {
  const cards = [
    {
      title: "Total Revenue",
      icon: DollarSign,
      // exemplo: valores diferentes dependendo do período
      amount:
        comparisonPeriod === "previous_year"
          ? "$500,000.00"
          : comparisonPeriod === "previous_quarter"
          ? "$120,000.00"
          : "$45,231.89",
      description: "+20.1% from last month",
      trend: "up",
    },
    {
      title: "New Customers",
      icon: Users,
      amount: comparisonPeriod === "previous_year" ? "24,500" : "2,350",
      description: "+180.1% from last month",
      trend: "up",
    },
    // ... resto dos cards
  ]

  return (
    <>
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.amount}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
            <div
              className={`mt-2 flex items-center text-xs ${
                card.trend === "up" ? "text-green-500" : "text-red-500"
              }`}
            >
              {card.trend === "up" ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingUp className="mr-1 h-3 w-3 transform rotate-180" />
              )}
              {card.description.split(" ")[0]}
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
