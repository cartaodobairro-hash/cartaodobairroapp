import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Copy, MessageCircle, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/lib/auth";
import { brl, maskCpf, maskPhone, onlyDigits } from "@/lib/format";
import { PageHeader } from "@/components/shells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/vendedor/nova-venda")({
  head: () => ({ meta: [
    { title: "Nova venda | Cartão do Bairro" },
    { name: "description", content: "Cadastre uma proposta e envie a adesão ao cliente." },
    { property: "og:title", content: "Nova venda | Cartão do Bairro" },
    { property: "og:description", content: "Cadastre uma proposta comercial do Cartão do Bairro." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: NewSale,
});

const empty = { name: "", cpf: "", whatsapp: "", email: "", birthDate: "", address: "", planId: "", paymentMethod: "InfinitePay", saleDate: new Date().toISOString().slice(0, 10), notes: "" };

function NewSale() {
  const { data: seller } = useSeller();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(empty);
  const [result, setResult] = useState<{ link: string; whatsapp: string } | null>(null);
  const { data: plans } = useQuery({ queryKey: ["seller-sale-plans"], queryFn: async () => {
    const { data, error } = await supabase.from("plans").select("id, name, price").eq("status", "ativo").order("price");
    if (error) throw error; return data;
  }});
  const save = useMutation({ mutationFn: async () => {
    if (!seller?.id || !form.planId) throw new Error("Selecione o plano.");
    const cpf = onlyDigits(form.cpf); const whatsapp = onlyDigits(form.whatsapp); const email = form.email.trim().toLowerCase();
    if (!form.name.trim() || cpf.length !== 11 || whatsapp.length < 10 || !email.includes("@")) throw new Error("Preencha nome, CPF, WhatsApp e e-mail válidos.");
    const { data: duplicate } = await supabase.from("seller_leads").select("id").neq("status", "perdido").or(`cpf.eq.${cpf},email.eq.${email},whatsapp.eq.${whatsapp}`).limit(1).maybeSingle();
    if (duplicate) throw new Error("Já existe uma proposta ativa com este CPF, e-mail ou WhatsApp.");
    const { data, error } = await supabase.from("seller_leads").insert({ seller_id: seller.id, name: form.name.trim(), cpf, whatsapp, phone: whatsapp, email, birth_date: form.birthDate || null, address: form.address || null, plan_id: form.planId, payment_method: form.paymentMethod, sale_date: form.saleDate, notes: form.notes || null, source: "painel_vendedor", status: "novo" }).select("proposal_token").single();
    if (error) throw error;
    return { link: `${window.location.origin}/auth?modo=cadastro&vendedor=${encodeURIComponent(seller.seller_code)}&proposta=${data.proposal_token}`, whatsapp };
  }, onSuccess: (value) => { setResult(value); setForm(empty); queryClient.invalidateQueries({ queryKey: ["seller-leads"] }); }, onError: (error: Error) => toast.error("Não foi possível criar a proposta", { description: error.message }) });
  const share = () => { if (!result) return; window.open(`https://wa.me/55${result.whatsapp}?text=${encodeURIComponent(`Olá! Finalize sua adesão ao Cartão do Bairro por este link seguro: ${result.link}`)}`, "_blank"); };
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <div><PageHeader title="Nova venda" description="Cadastre a proposta e envie o link seguro ao cliente" />
    {result ? <section className="rounded-lg border border-success/30 bg-success/5 p-5"><CheckCircle2 className="size-8 text-success" /><h2 className="mt-3 text-lg font-bold">Proposta criada</h2><p className="mt-1 text-sm text-muted-foreground">O cliente criará a própria senha e seguirá para o pagamento.</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={share}><MessageCircle className="size-4" />Enviar pelo WhatsApp</Button><Button variant="outline" onClick={() => { navigator.clipboard.writeText(result.link); toast.success("Link copiado"); }}><Copy className="size-4" />Copiar link</Button><Button variant="ghost" onClick={() => setResult(null)}>Criar outra</Button></div></section> :
    <form className="grid gap-4 rounded-lg border border-border bg-card p-5 shadow-card md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
      <div className="md:col-span-2 flex items-center gap-2 border-b border-border pb-3"><ShoppingBag className="size-5 text-primary"/><h2 className="font-bold">Dados da proposta</h2></div>
      {([['name','Nome completo'],['cpf','CPF'],['whatsapp','WhatsApp'],['email','E-mail'],['birthDate','Data de nascimento'],['address','Endereço completo']] as const).map(([key,label]) => <div key={key} className={key === 'address' ? 'md:col-span-2' : ''}><Label htmlFor={key}>{label}</Label><Input id={key} className="mt-1" type={key === 'email' ? 'email' : key === 'birthDate' ? 'date' : 'text'} required={!['birthDate','address'].includes(key)} value={form[key]} onChange={(e) => set(key, key === 'cpf' ? maskCpf(e.target.value) : key === 'whatsapp' ? maskPhone(e.target.value) : e.target.value)} /></div>)}
      <div><Label>Plano escolhido</Label><select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required value={form.planId} onChange={(e) => set('planId', e.target.value)}><option value="">Selecione</option>{plans?.map((p) => <option key={p.id} value={p.id}>{p.name} — {brl(p.price)}/mês</option>)}</select></div>
      <div><Label>Forma de pagamento</Label><Input className="mt-1" readOnly value={form.paymentMethod} /></div>
      <div><Label>Data da venda</Label><Input className="mt-1" type="date" value={form.saleDate} onChange={(e) => set('saleDate', e.target.value)} /></div>
      <div className="md:col-span-2"><Label>Observações</Label><Textarea className="mt-1" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
      <div className="md:col-span-2"><Button size="lg" disabled={save.isPending}>{save.isPending ? "Gerando proposta..." : "Finalizar e gerar link"}</Button></div>
    </form>}
  </div>;
}