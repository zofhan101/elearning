import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, Link2, Play, BookMarked, Plus, Calendar, ChevronRight, Download, File, Video, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const KIND_ICON: any = {
  presentation: Play,
  reading: BookMarked,
  link: Link2,
  text: FileText,
  video: Video,
  file: File,
  image: ImageIcon,
};

function iconForUrl(url?: string | null) {
  if (!url) return FileText;
  const u = url.toLowerCase();
  if (/\.(mp4|webm|mov|m4v|avi|mkv)(\?|$)/.test(u)) return Video;
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/.test(u)) return ImageIcon;
  if (/\.(pdf|docx?|pptx?|xlsx?|zip|rar)(\?|$)/.test(u)) return File;
  return Link2;
}

export default function CourseModules() {
  const { id } = useParams();
  const { isStaff } = useAuth();
  const [modules, setModules] = useState<any[]>([]);
  const [openModule, setOpenModule] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("modules")
        .select("*")
        .eq("course_id", id)
        .order("position");
      setModules(data ?? []);
      if (data && data[1]) setOpenModule(data[1].id);
    })();
  }, [id]);

  useEffect(() => {
    if (!openModule || blocks[openModule]) return;
    supabase
      .from("content_blocks")
      .select("*")
      .eq("module_id", openModule)
      .order("position")
      .then(({ data }) => setBlocks((b) => ({ ...b, [openModule]: data ?? [] })));
  }, [openModule, blocks]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Content and Activities</h1>
        {isStaff && (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add to Module List
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {modules.map((m) => {
          const isOpen = openModule === m.id;
          const items = blocks[m.id] ?? [];
          return (
            <div key={m.id} className="surface-card overflow-hidden">
              <button
                className="w-full flex items-start gap-4 p-5 text-left hover:bg-muted/50 transition-colors"
                onClick={() => setOpenModule(isOpen ? null : m.id)}
              >
                <div className="h-10 w-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0 font-semibold">
                  {m.position + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{m.title}</h3>
                  {m.description && <p className="text-sm text-muted-foreground mt-0.5">{m.description}</p>}
                  {m.start_date && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      From {new Date(m.start_date).toLocaleDateString("en-US", { day: "numeric", month: "long" })} to{" "}
                      {new Date(m.end_date).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  )}
                </div>
                <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </button>

              {isOpen && (
                <div className="border-t border-border bg-muted/30 p-5 space-y-4">
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No content for this module.</p>
                  ) : (
                    Object.entries(groupBy(items, "section")).map(([section, list]) => (
                      <div key={section}>
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-primary mb-2">
                          {section || "Content"}
                        </div>
                        <div className="space-y-2">
                          {(list as any[]).map((b) => {
                            const Icon = KIND_ICON[b.kind] ?? iconForUrl(b.url);
                            const isVideo = b.kind === "video" || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(b.url ?? "");
                            const isImage = b.kind === "image" || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(b.url ?? "");
                            const isPdf = /\.pdf(\?|$)/i.test(b.url ?? "");
                            const content = (
                              <div className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors">
                                <div className="h-9 w-9 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm flex items-center gap-2">
                                    <span className="truncate">{b.title}</span>
                                    {b.url && <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                                  </div>
                                  {b.body && <p className="text-sm text-muted-foreground mt-0.5">{b.body}</p>}
                                  {b.meta && <div className="text-xs text-muted-foreground mt-1">{b.meta}</div>}
                                  {b.url && (isVideo || isImage || isPdf) && (
                                    <div className="mt-3">
                                      {isVideo && (
                                        <video src={b.url} controls className="w-full max-h-[480px] rounded-md bg-black" />
                                      )}
                                      {isImage && (
                                        <img src={b.url} alt={b.title} className="w-full max-h-[480px] rounded-md object-contain bg-muted" />
                                      )}
                                      {isPdf && (
                                        <iframe src={b.url} title={b.title} className="w-full h-[600px] rounded-md border border-border bg-card" />
                                      )}
                                    </div>
                                  )}
                                  {b.url && (
                                    <div className="mt-2 flex gap-2">
                                      <a href={b.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                        <Link2 className="h-3 w-3" /> Open
                                      </a>
                                      <a href={b.url} download className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                        <Download className="h-3 w-3" /> Download
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                            return b.url && !(isVideo || isImage || isPdf) ? (
                              <a key={b.id} href={b.url} target="_blank" rel="noopener noreferrer" className="block">
                                {content}
                              </a>
                            ) : (
                              <div key={b.id}>{content}</div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function groupBy<T extends Record<string, any>>(arr: T[], key: keyof T) {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = String(item[key] ?? "Content");
    (acc[k] ||= []).push(item);
    return acc;
  }, {});
}
