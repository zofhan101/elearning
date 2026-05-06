import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Cohort { id: string; name: string }

const NONE = "__none__";

export function CohortSelect({
  value,
  onChange,
  placeholder = "— Tous les étudiants —",
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  placeholder?: string;
}) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  useEffect(() => {
    supabase.from("cohorts").select("id,name").order("name").then(({ data }) => {
      setCohorts((data as any) ?? []);
    });
  }, []);
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
    >
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{placeholder}</SelectItem>
        {cohorts.map((c) => (
          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
