"use client";

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Download,
  BookOpen,
  FileText,
  Scale,
  Receipt,
  DollarSign,
  Loader2,
} from "lucide-react";

const API = "http://localhost:5000/api/accounts";

const AccountsModule = () => {
  const [loading, setLoading] = useState(true);

  const [daybook, setDaybook] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [trial, setTrial] = useState([]);
  const [vat, setVat] = useState([]);
  const [balanceSheet, setBalanceSheet] = useState({});
  const [pal, setPAL] = useState({});

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("auth_token");

      const headers = { Authorization: `Bearer ${token}` };

      const [d, l, t, b, v, p] = await Promise.all([
        fetch(`${API}/daybook`, { headers }).then((r) => r.json()),
        fetch(`${API}/ledger`, { headers }).then((r) => r.json()),
        fetch(`${API}/trial-balance`, { headers }).then((r) => r.json()),
        fetch(`${API}/balance-sheet`, { headers }).then((r) => r.json()),
        fetch(`${API}/vat`, { headers }).then((r) => r.json()),
        fetch(`${API}/pal`, { headers }).then((r) => r.json()),
      ]);

      setDaybook(d.data || []);
      setLedger(l.data || []);
      setTrial(t.trial_balance || []);
      setVat(v.data || []);
      setBalanceSheet(b || {});
      setPAL(p || {});
    } catch (err) {
      console.error("Error loading accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const navigate = useNavigate();
  const location = useLocation();

  const getInitialTab = () => {
    const path = location.pathname || "";
    // Support both /account (mounted route) and /accounts (older URLs)
    if (
      path.includes("/account/balance-sheet") ||
      path.includes("/accounts/balance-sheet")
    )
      return "balance";
    if (path.includes("/account/ledger") || path.includes("/accounts/ledger"))
      return "ledger";
    if (
      path.includes("/account/trial-balance") ||
      path.includes("/accounts/trial-balance")
    )
      return "trial";
    if (path.includes("/account/vat") || path.includes("/accounts/vat"))
      return "vat";
    if (path.includes("/account/pal") || path.includes("/accounts/pal"))
      return "pal";
    if (path.includes("/account/daybook") || path.includes("/accounts/daybook"))
      return "daybook";
    // default route is /account (mounted in App.tsx) — accept /accounts too
    if (
      path === "/account" ||
      path.startsWith("/account") ||
      path === "/accounts" ||
      path.startsWith("/accounts")
    )
      return "daybook";
    return "daybook";
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab());

  useEffect(() => {
    const tabRoutes: Record<string, string> = {
      // Primary (mounted) path is /account — keep /accounts as legacy accepted path in getInitialTab
      daybook: "/account",
      ledger: "/account/ledger",
      trial: "/account/trial-balance",
      balance: "/account/balance-sheet",
      vat: "/account/vat",
      pal: "/account/pal",
    };
    const currentRoute = tabRoutes[activeTab] || "/accounts";
    if (location.pathname !== currentRoute) {
      navigate(currentRoute, { replace: true });
    }
  }, [activeTab, navigate, location.pathname]);

  // Keep activeTab in sync when the user navigates (back/forward or external link)
  useEffect(() => {
    const path = location.pathname || "";
    if (path.includes("/accounts/balance-sheet") && activeTab !== "balance")
      setActiveTab("balance");
    else if (path.includes("/accounts/ledger") && activeTab !== "ledger")
      setActiveTab("ledger");
    else if (path.includes("/accounts/trial-balance") && activeTab !== "trial")
      setActiveTab("trial");
    else if (path.includes("/accounts/vat") && activeTab !== "vat")
      setActiveTab("vat");
    else if (path.includes("/accounts/pal") && activeTab !== "pal")
      setActiveTab("pal");
    else if (
      (path === "/accounts" || path.includes("/accounts/daybook")) &&
      activeTab !== "daybook"
    )
      setActiveTab("daybook");
  }, [location.pathname]);

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Loading Accounts…</p>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounts & Finance</h1>
          <p className="text-muted-foreground">View all financial statements</p>
        </div>

        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              Total Assets
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            AED {balanceSheet?.totals?.assetTotal || 0}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              Liabilities
            </CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            AED {balanceSheet?.totals?.liabilityTotal || 0}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              Equity
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            AED {balanceSheet?.totals?.equityTotal || 0}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              VAT Payable
            </CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            AED {vat[0]?.vat_payable || 0}
          </CardContent>
        </Card>
      </div>

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(String(v))}>
        <TabsList>
          <TabsTrigger value="daybook">Daybook</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="trial">Trial Balance</TabsTrigger>
          <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
          <TabsTrigger value="vat">VAT</TabsTrigger>
          <TabsTrigger value="pal">Profit & Loss</TabsTrigger>
        </TabsList>

        {/* DAYBOOK */}
        <TabsContent value="daybook">
          <Card>
            <CardHeader>
              <CardTitle>
                <BookOpen /> Daybook
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Debit</TableHead>
                    <TableHead>Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daybook.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.date}</TableCell>
                      <TableCell>
                        <Badge>{d.entry_type}</Badge>
                      </TableCell>
                      <TableCell>{d.description}</TableCell>
                      <TableCell>{d.debit}</TableCell>
                      <TableCell>{d.credit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LEDGER */}
        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <CardTitle>
                <FileText /> Ledger
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Debit</TableHead>
                    <TableHead>Credit</TableHead>
                    <TableHead>Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.account_type}</TableCell>
                      <TableCell>{l.entry_type}</TableCell>
                      <TableCell>{l.debit}</TableCell>
                      <TableCell>{l.credit}</TableCell>
                      <TableCell>{l.balance}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRIAL BALANCE */}
        <TabsContent value="trial">
          <Card>
            <CardHeader>
              <CardTitle>
                <Scale /> Trial Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Debit</TableHead>
                    <TableHead>Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trial.map((t) => (
                    <TableRow key={t.account_id}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{t.debit}</TableCell>
                      <TableCell>{t.credit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BALANCE SHEET */}
        <TabsContent value="balance">
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet</CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="font-bold text-lg">Assets</h3>
              <Table className="mb-6">
                <TableBody>
                  {balanceSheet.assets &&
                    Object.entries(balanceSheet.assets).map(
                      ([name, amount]) => (
                        <TableRow key={name}>
                          <TableCell>{name}</TableCell>
                          <TableCell className="font-bold">{amount}</TableCell>
                        </TableRow>
                      )
                    )}
                </TableBody>
              </Table>

              <h3 className="font-bold text-lg">Liabilities</h3>
              <Table className="mb-6">
                <TableBody>
                  {balanceSheet.liabilities &&
                    Object.entries(balanceSheet.liabilities).map(
                      ([name, amount]) => (
                        <TableRow key={name}>
                          <TableCell>{name}</TableCell>
                          <TableCell className="font-bold">{amount}</TableCell>
                        </TableRow>
                      )
                    )}
                </TableBody>
              </Table>

              <h3 className="font-bold text-lg">Equity</h3>
              <Table>
                <TableBody>
                  {balanceSheet.equity &&
                    Object.entries(balanceSheet.equity).map(
                      ([name, amount]) => (
                        <TableRow key={name}>
                          <TableCell>{name}</TableCell>
                          <TableCell className="font-bold">{amount}</TableCell>
                        </TableRow>
                      )
                    )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VAT */}
        <TabsContent value="vat">
          <Card>
            <CardHeader>
              <CardTitle>VAT Report</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Total Sales</TableHead>
                    <TableHead>Sales VAT</TableHead>
                    <TableHead>Purchase VAT</TableHead>
                    <TableHead>VAT Payable</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {vat.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>{v.period}</TableCell>
                      <TableCell>{v.total_sales}</TableCell>
                      <TableCell>{v.sales_vat}</TableCell>
                      <TableCell>{v.purchase_vat}</TableCell>
                      <TableCell className="font-bold">
                        {v.vat_payable}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROFIT & LOSS */}
        <TabsContent value="pal">
          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss Statement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-bold text-lg">Income</h3>
              <Table>
                <TableBody>
                  {pal.income_accounts?.map((acc) => (
                    <TableRow key={acc.account_id}>
                      <TableCell>{acc.name}</TableCell>
                      <TableCell className="font-bold text-green-600">
                        {acc.amount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <h3 className="font-bold text-lg">Expenses</h3>
              <Table>
                <TableBody>
                  {pal.expense_accounts?.map((acc) => (
                    <TableRow key={acc.account_id}>
                      <TableCell>{acc.name}</TableCell>
                      <TableCell className="font-bold text-red-500">
                        {acc.amount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="p-4 bg-muted rounded-lg flex justify-between">
                <span className="font-bold text-lg">Net Profit</span>
                <span className="font-bold text-xl">AED {pal.net_profit}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountsModule;
