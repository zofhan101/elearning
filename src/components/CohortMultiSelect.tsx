import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";

interface Cohort {
  id: string;
  name: string;
}

export function CohortMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);

  useEffect(() => {
    supabase
      .from("cohorts")
      .select("id,name")
      .order("name")
      .then(({ data }) => setCohorts((data as any) ?? []));
  }, []);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  if (cohorts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground border rounded-md p-3">
        No cohorts yet. Create one under Administration → Cohorts.
      </p>
    );
  }

  return (
    <div>
      <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
        {cohorts.map((c) => (
          <label
            key={c.id}
            className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
          >
            <Checkbox checked={value.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
            {c.name}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {value.length === 0
          ? "No cohort selected — the course will be visible to everyone."
          : `Visible to ${value.length} selected cohort${value.length > 1 ? "s" : ""}.`}
      </p>
    </div>
  );
}
