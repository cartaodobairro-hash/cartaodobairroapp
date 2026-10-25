import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function AttendanceReview({ usageId, onSuccess }: { usageId: string; onSuccess: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: async () => {
      if (rating < 1 || rating > 5) throw new Error("Escolha uma nota de 1 a 5");
      const { error } = await supabase.rpc("submit_attendance_review", { _usage_id: usageId, _rating: rating, _comment: comment.trim() });
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all(["notifications", "my-reviews", "partner-reviews", "partner", "highlight-partners", "partners", "favorites"].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
      toast.success("Avaliação enviada. Obrigado!");
      onSuccess();
    },
    onError: () => toast.error("Não foi possível enviar a avaliação. Atualize a página e tente novamente."),
  });
  return <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
    <div role="group" aria-label="Nota do atendimento" className="flex gap-2">
      {[1, 2, 3, 4, 5].map((note) => <Button key={note} type="button" variant="ghost" size="icon" disabled={save.isPending} aria-label={`${note} ${note === 1 ? "estrela" : "estrelas"}`} aria-pressed={rating === note} title={`${note} ${note === 1 ? "estrela" : "estrelas"}`} onClick={() => setRating(note)}>
        <Star className={`size-7 ${note <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
      </Button>)}
    </div>
    <div className="space-y-2"><Label htmlFor={`review-${usageId}`}>Comentário (opcional)</Label><Textarea id={`review-${usageId}`} maxLength={1000} value={comment} disabled={save.isPending} onChange={(event) => setComment(event.target.value)} /></div>
    <Button type="submit" disabled={!rating || save.isPending} className="w-full">{save.isPending ? "Enviando…" : "Enviar avaliação"}</Button>
  </form>;
}