import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/lib/auth";
import { brl, dateBR, maskCpf, maskPhone } from "@/lib/format";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SellerStatus } from "@/components/seller-status";
export const Route=createFileRoute("/_authenticated/vendedor/leads")({head:()=>({meta:[{title:"Meus clientes | Cartão do Bairro"},{name:"description",content:"Clientes e propostas do vendedor."},{property:"og:title",content:"Meus clientes | Cartão do Bairro"},{property:"og:description",content:"Acompanhe clientes e propostas."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),component:SellerClients});
function SellerClients() {
  const { data: seller } = useSeller();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const { data, isLoading, error } = useQuery({
    queryKey: ["seller-clients", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      if (!seller?.id) return [];
      const [leadsResult, customersResult] = await Promise.all([
        supabase.from("seller_leads").select("id, customer_id, name, cpf, whatsapp, phone, email, status, created_at, sale_date, plans(name,price)").eq("seller_id", seller.id).order("created_at", { ascending: false }),
        supabase.from("customers").select("id, user_id, status, created_at, plans(name,price), subscriptions(status,created_at)").eq("seller_id", seller.id).order("created_at", { ascending: false }),
      ]);
      if (leadsResult.error) throw leadsResult.error;
      if (customersResult.error) throw customersResult.error;
      const customers = customersResult.data ?? [];
      const profilesResult = customers.length
        ? await supabase.from("profiles").select("id,name,cpf,phone,email").in("id", customers.map((customer) => customer.user_id))
        : { data: [], error: null };
      if (profilesResult.error) throw profilesResult.error;
      const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
      const linkedIds = new Set(customers.map((customer) => customer.id));
      const registered = customers.map((customer) => {
        const profile = profiles.get(customer.user_id);
        const subscription = [...(customer.subscriptions ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
        return {
          id: customer.id,
          name: profile?.name || "Sem nome",
          cpf: profile?.cpf,
          contact: profile?.phone,
          email: profile?.email,
          plan: customer.plans?.name,
          price: customer.plans?.price,
          createdAt: customer.created_at,
          status: subscription?.status === "ativo" ? "ativo" : customer.status === "ativo" ? "ativo" : "cadastro",
        };
      });
      const proposals = (leadsResult.data ?? []).filter((lead) => !lead.customer_id || !linkedIds.has(lead.customer_id)).map((lead) => ({
        id: lead.id,
        name: lead.name,
        cpf: lead.cpf,
        contact: lead.whatsapp ?? lead.phone,
        email: lead.email,
        plan: lead.plans?.name,
        price: lead.plans?.price,
        createdAt: lead.created_at,
        status: lead.status as string,
      }));
      return [...registered, ...proposals].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  });
  const rows = useMemo(() => (data ?? []).filter((row) => {
    const matchesStatus = filter === "todos" || filter === "ativos" && row.status === "ativo" || filter === "pendentes" && !["ativo", "perdido"].includes(row.status) || filter === "inativos" && row.status === "perdido";
    const text = `${row.name} ${row.cpf ?? ""} ${row.contact ?? ""} ${row.email ?? ""}`.toLowerCase();
    const q = search.trim().toLowerCase();
    return matchesStatus && (!q || text.includes(q) || (q.replace(/\D/g, "").length > 0 && text.replace(/\D/g, "").includes(q.replace(/\D/g, ""))));
  }), [data, search, filter]);
  return <div>
    <PageHeader title="Meus clientes" description="Propostas, cadastros e situação de cada cliente" action={<Button asChild><Link to="/vendedor/nova-venda"><Plus className="size-4"/>Nova venda</Link></Button>}/>
    <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input className="pl-9" placeholder="Buscar por nome, CPF, e-mail ou WhatsApp" value={search} onChange={(e) => setSearch(e.target.value)}/></div><select className="h-10 rounded-md border bg-background px-3 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="todos">Todos</option><option value="ativos">Ativos</option><option value="pendentes">Pendentes</option><option value="inativos">Inativos</option></select></div>
    <div className="mt-3 overflow-x-auto rounded-lg border bg-card"><table className="w-full text-sm"><thead className="border-b text-left text-xs uppercase text-muted-foreground"><tr>{["Cliente", "Contato", "Plano", "Cadastro", "Valor", "Status"].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="p-3"><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.cpf ? maskCpf(row.cpf) : "CPF não informado"}</p></td><td className="p-3">{row.contact ? maskPhone(row.contact) : "—"}</td><td className="p-3">{row.plan ?? "—"}</td><td className="p-3">{dateBR(row.createdAt)}</td><td className="p-3">{row.price == null ? "—" : brl(row.price)}</td><td className="p-3"><SellerStatus value={row.status}/></td></tr>)}</tbody></table>
      {isLoading && <p className="p-5 text-sm text-muted-foreground">Carregando clientes...</p>}
      {error && <p className="p-5 text-sm text-destructive">Não foi possível carregar os clientes.</p>}
      {!isLoading && !error && !rows.length && <p className="p-5 text-sm text-muted-foreground">Nenhum cliente encontrado.</p>}
    </div>
  </div>;
}