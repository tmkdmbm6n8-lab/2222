import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, CalendarDays, TrendingUp, ClipboardList, Euro, Target } from "lucide-react";

type CommercialRequest = {
  id: string;
  created_at: string;
  kind: string;
  status: string;
  amount: number | string | null;
  customer_name: string;
  details?: unknown;
};

const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
const dateValue = (value: string) => new Date(value).toLocaleDateString("fr-FR");

export function AdminCommercial({ requests }: { requests: CommercialRequest[] }) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const filtered = useMemo(() => requests.filter((r) => {
    const day = r.created_at.slice(0, 10);
    return day >= from && day <= to;
  }), [requests, from, to]);

  const completed = filtered.filter((r) => r.status === "completed");
  const completedValue = completed.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const average = completed.length ? completedValue / completed.length : 0;
  const salesFunnel = filtered.filter((r) => r.kind === "quote" || r.kind === "booking");
  const converted = salesFunnel.filter((r) => ["accepted", "confirmed", "completed"].includes(r.status)).length;
  const conversion = salesFunnel.length ? converted / salesFunnel.length * 100 : 0;
  const serviceTotals = new Map<string, { count: number; value: number }>();
  for (const r of completed) {
    const details = r.details && typeof r.details === "object" ? r.details as Record<string, unknown> : {};
    const service = typeof details.service === "string" && details.service ? details.service : r.kind === "booking" ? "Réservation" : "Devis";
    const item = serviceTotals.get(service) ?? { count: 0, value: 0 };
    item.count++;
    item.value += Number(r.amount) || 0;
    serviceTotals.set(service, item);
  }
  const services = [...serviceTotals.entries()].sort((a, b) => b[1].value - a[1].value);

  const exportCsv = () => {
    const rows = [
      ["Date", "Client", "Type", "Statut", "Montant (€)", "ID"],
      ...filtered.map((r) => [dateValue(r.created_at), r.customer_name, r.kind, r.status, String(Number(r.amount) || 0), r.id]),
    ];
    const csv = "\uFEFF" + rows.map((row) => row.map((cell) => '"' + String(cell).replaceAll('"', '""') + '"').join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `tclean-rapport-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { label: "Montant des interventions terminées", value: money(completedValue), note: "Montants enregistrés sur les demandes au statut « terminé »", icon: Euro },
    { label: "Panier moyen terminé", value: money(average), note: "Moyenne des montants des interventions terminées", icon: TrendingUp },
    { label: "Demandes devis / réservation", value: String(salesFunnel.length), note: "Sur la période sélectionnée", icon: ClipboardList },
    { label: "Taux de conversion indicatif", value: `${conversion.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`, note: `Demandes acceptées, confirmées ou terminées : ${converted}/${salesFunnel.length}`, icon: Target },
  ];

  return <section className="admin-commercial">
    <div className="inline-actions justify-between mb-6">
      <div><h2 className="text-2xl font-semibold">Tableau de bord commercial</h2><p className="text-sm text-muted-foreground mt-2">Indicateurs calculés à partir des demandes enregistrées dans TClean.</p></div>
      <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Exporter en CSV</Button>
    </div>
    <div className="form-panel mb-6">
      <div className="inline-actions mb-4"><CalendarDays className="h-5 w-5" /><strong>Période d’analyse</strong></div>
      <div className="field-grid">
        <div className="field"><label htmlFor="commercial-from">Du</label><input id="commercial-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="field"><label htmlFor="commercial-to">Au</label><input id="commercial-to" type="date" value={to} min={from} max={today.toISOString().slice(0, 10)} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
    </div>
    <div className="commercial-stats">
      {stats.map(({ label, value, note, icon: Icon }) => <article className="commercial-stat" key={label}><div className="commercial-stat-icon"><Icon className="h-5 w-5" /></div><p>{label}</p><strong>{value}</strong><small>{note}</small></article>)}
    </div>
    <div className="form-panel mt-6">
      <h3 className="mb-4">Prestations les plus génératrices de montant</h3>
      {services.length ? <div className="admin-list">{services.map(([name, item]) => <div className="commercial-service-row" key={name}><div><strong>{name}</strong><p className="text-xs text-muted-foreground">{item.count} intervention(s) terminée(s)</p></div><strong>{money(item.value)}</strong></div>)}</div> : <p className="text-sm text-muted-foreground">Aucune intervention terminée sur cette période.</p>}
    </div>
    <div className="form-panel mt-6">
      <h3 className="mb-4">Dernières demandes de la période ({filtered.length})</h3>
      {filtered.length ? <div className="admin-list">{filtered.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 30).map((r) => <div className="commercial-service-row" key={r.id}><div><strong>{r.customer_name || "Client"}</strong><p className="text-xs text-muted-foreground">{dateValue(r.created_at)} · {r.kind} · {r.status}</p></div><strong>{r.amount == null ? "—" : money(Number(r.amount) || 0)}</strong></div>)}</div> : <p className="text-sm text-muted-foreground">Aucune demande sur cette période.</p>}
    </div>
    <p className="text-xs text-muted-foreground mt-4">Important : le montant des interventions terminées n’est pas une preuve d’encaissement. Le taux de conversion est indicatif et compare les statuts enregistrés. Les coûts et marges ne sont pas calculés, car les coûts par prestation ne sont pas renseignés dans les données actuelles.</p>
  </section>;
}
