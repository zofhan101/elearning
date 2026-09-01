import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Module {
  id: string;
  title: string;
}

const NONE = "__none__";

export function ModuleSelect({
  courseId,
  value,
  onChange,
}: {
  courseId: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [modules, setModules] = useState<Module[]>([]);

  useEffect(() => {
    supabase
      .from("modules")
      .select("id,title")
      .eq("course_id", courseId)
      .order("position")
      .then(({ data }) => setModules((data as any) ?? []));
  }, [courseId]);

  return (
    <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
      <SelectTrigger><SelectValue placeholder="— Not linked to a module —" /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>— Not linked to a module —</SelectItem>
        {modules.map((m) => (
          <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
