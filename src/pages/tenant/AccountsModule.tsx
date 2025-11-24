"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Download,
  DollarSign,
  Scale,
  FileText,
  Receipt
} from 'lucide-react';

// API BASE
const API = "https://billingbackend-1vei.onrender.com/api/accounts";

const AccountsModule = () => {

  const [loading, setLoading] = useState(true);

  const [daybook, setDaybook] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [trial, setTrial] = useState([]);
  const [vat, setVat] = useState([]);
  const [balanceSheet, setBalanceSheet] = useState({
    assets: 0,
    liabilities: 0,
    equity: 0
  });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("auth_token");

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      };

      const [d, l, t, b, v] = await Promise.all([
        fetch(`${API}/daybook`, { headers }).then(r => r.json()),
        fetch(`${API}/ledger`, { headers }).then(r => r.json()),
        fetch(`${API}/trial-balance`, { headers }).then(r => r.json()),
        fetch(`${API}/balance-sheet`, { headers }).then(r => r.json()),
        fetch(`${API}/vat`, { headers }).then(r => r.json()),
      ]);

      setDaybook(d.data || []);
      setLedger(l.data || []);
      setTrial(t.data || []);
      setVat(v.data || []);
      setBalanceSheet({
        assets: b.assets || 0,
        liabilities: b.liabilities || 0,
        equity: b.equity || 0
      });
    } catch (err) {
      console.error("Error loading accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="p-8 text-center text-xl">Loading Accounts…</div>;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounts & Finance</h1>
          <p className="text-muted-foreground mt-1">Manage financial records and statements</p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Reports
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
      
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Assets</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {balanceSheet.assets}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Liabilities</CardTitle>
            <DollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {balanceSheet.liabilities}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Equity</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {balanceSheet.equity}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">VAT Payable</CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              AED {vat[0]?.vat_payable || 0}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* TABS */}
      <Tabs defaultValue="daybook" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daybook">Daybook</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="vat">VAT Report</TabsTrigger>
        </TabsList>

        {/* DAYBOOK */}
        <TabsContent value="daybook">
          <Card>
            <CardHeader>
              <div className="flex justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Daybook
                </CardTitle>
              </div>
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
                      <TableCell><Badge>{d.entry_type}</Badge></TableCell>
                      <TableCell>{d.description}</TableCell>
                      <TableCell className="text-destructive">
                        {d.debit > 0 ? `AED ${d.debit}` : "-"}
                      </TableCell>
                      <TableCell className="text-success">
                        {d.credit > 0 ? `AED ${d.credit}` : "-"}
                      </TableCell>
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
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Ledger
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
                      <TableCell className={l.balance < 0 ? "text-destructive" : "text-success"}>
                        AED {l.balance}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>

              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BALANCE SHEET */}
        <TabsContent value="balance-sheet">
          <Card>
            <CardHeader><CardTitle>Balance Sheet</CardTitle></CardHeader>

            <CardContent className="space-y-3">
              <div className="flex justify-between p-3 bg-muted rounded-lg">
                <span>Assets</span>
                <span className="font-bold">AED {balanceSheet.assets}</span>
              </div>

              <div className="flex justify-between p-3 bg-muted rounded-lg">
                <span>Liabilities</span>
                <span className="font-bold">AED {balanceSheet.liabilities}</span>
              </div>

              <div className="flex justify-between p-3 bg-primary/10 rounded-lg">
                <span className="font-bold">Equity</span>
                <span className="font-bold text-lg">AED {balanceSheet.equity}</span>
              </div>
            </CardContent>

          </Card>
        </TabsContent>

        {/* TRIAL BALANCE */}
        <TabsContent value="trial-balance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5" />
                Trial Balance
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
                    <TableRow key={t.id}>
                      <TableCell>{t.account}</TableCell>
                      <TableCell>{t.debit}</TableCell>
                      <TableCell>{t.credit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>

              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VAT REPORT */}
        <TabsContent value="vat">
          <Card>
            <CardHeader><CardTitle>VAT Report</CardTitle></CardHeader>

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
                      <TableCell className="font-bold">{v.vat_payable}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>

              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default AccountsModule;
