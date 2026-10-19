import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
  CarFront,
  Moon,
  Plus,
  Receipt,
  ShoppingBasket,
  Sun,
  Users,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const activities = [
  {
    title: "Groceries",
    group: "Weekend trip",
    category: "Food & groceries",
    amount: "₹1,250.00",
    share: "₹625.00",
    Icon: ShoppingBasket,
  },
  {
    title: "Taxi",
    group: "Apartment group",
    category: "Transport",
    amount: "₹480.00",
    share: "₹160.00",
    Icon: CarFront,
  },
];

function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ArrowLeftRight aria-hidden="true" className="size-5" />
            </span>
            <span className="text-xl font-semibold tracking-tight">
              Splitly
            </span>
          </a>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setDarkMode((current) => !current)}
            >
              {darkMode ? (
                <Sun aria-hidden="true" />
              ) : (
                <Moon aria-hidden="true" />
              )}
            </Button>

            <Button variant="outline" size="icon" aria-label="Notifications">
              <Bell aria-hidden="true" />
            </Button>

            <Button className="hidden sm:inline-flex">
              <Plus aria-hidden="true" />
              Add expense
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">
              YOUR MONEY, IN SYNC
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Design system preview
            </h1>
            <p className="max-w-2xl text-muted-foreground">
              A shared visual foundation for groups, expenses, balances and
              settlements.
            </p>
          </div>

          <Button className="sm:hidden">
            <Plus aria-hidden="true" />
            Add expense
          </Button>
        </section>

        <section
          aria-label="Balance card examples"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardDescription>Net balance</CardDescription>
              <Wallet className="size-5 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                ₹4,250.00
              </p>
              <p className="text-sm text-muted-foreground">
                Across your groups
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardDescription>You are owed</CardDescription>
              <ArrowDownRight
                className="size-5 text-success-foreground"
                aria-hidden="true"
              />
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                ₹5,000.00
              </p>
              <span className="inline-flex items-center rounded-full bg-success px-2.5 py-1 text-xs font-medium text-success-foreground">
                Money owed to you
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardDescription>You owe</CardDescription>
              <ArrowUpRight
                className="size-5 text-warning-foreground"
                aria-hidden="true"
              />
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                ₹750.00
              </p>
              <span className="inline-flex items-center rounded-full bg-warning px-2.5 py-1 text-xs font-medium text-warning-foreground">
                Outstanding amount
              </span>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>
                Example expense rows and amount hierarchy
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-1">
              {activities.map(({ title, group, category, amount, share, Icon }) => (
                <div
                  key={title}
                  className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/70"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>

                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-medium">{title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {group}
                    </p>
                    <p className="text-xs text-muted-foreground">{category}</p>
                  </div>

                  <div className="shrink-0 space-y-1 text-right">
                    <p className="font-semibold tabular-nums">{amount}</p>
                    <p className="text-xs text-muted-foreground">
                      Your share {share}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Component playground</CardTitle>
              <CardDescription>
                Reusable controls for upcoming Splitly screens
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="expense-name">Expense name</Label>
                <Input
                  id="expense-name"
                  placeholder="e.g. Groceries"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button>
                  <Plus aria-hidden="true" />
                  Primary
                </Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success px-2.5 py-1 text-xs font-medium text-success-foreground">
                  <ArrowDownRight aria-hidden="true" className="size-3.5" />
                  You are owed
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warning px-2.5 py-1 text-xs font-medium text-warning-foreground">
                  <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  You owe
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-info px-2.5 py-1 text-xs font-medium text-info-foreground">
                  <Users aria-hidden="true" className="size-3.5" />
                  Group
                </span>
              </div>

              <Button variant="outline" className="w-full">
                <Receipt aria-hidden="true" />
                View expense details
              </Button>
            </CardContent>
          </Card>
        </section>

        <footer className="flex flex-col gap-2 border-t py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Splitly design system · v1.0</p>
          <p>Teal, mint, neutral surfaces and semantic balance states</p>
        </footer>
      </main>
    </div>
  );
}

export default App;