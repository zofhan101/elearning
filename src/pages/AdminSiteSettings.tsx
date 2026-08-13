import { useRef, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Trash2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const LOGIN_IMAGE_PATH = "site/login-image";

export default function AdminSiteSettings() {
  const { isAdmin } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [preview, setPreview] = useState(
    `${supabase.storage.from("course-files").getPublicUrl(LOGIN_IMAGE_PATH).data.publicUrl}?t=${Date.now()}`,
  );
  const [previewOk, setPreviewOk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshPreview = () => {
    setPreview(`${supabase.storage.from("course-files").getPublicUrl(LOGIN_IMAGE_PATH).data.publicUrl}?t=${Date.now()}`);
  };

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setUploading(true);
    try {
      const { error } = await supabase.storage
        .from("course-files")
        .upload(LOGIN_IMAGE_PATH, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      toast.success("Login page image updated");
      refreshPreview();
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = async () => {
    if (!confirm("Remove the login page image? The sign-in page will go back to a single centered column.")) return;
    setRemoving(true);
    try {
      const { error } = await supabase.storage.from("course-files").remove([LOGIN_IMAGE_PATH]);
      if (error) throw error;
      toast.success("Login page image removed");
      setPreviewOk(false);
      refreshPreview();
    } catch (err: any) {
      toast.error(err.message ?? "Error removing image");
    } finally {
      setRemoving(false);
    }
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="container py-16 text-center">
          <h1 className="text-xl font-semibold mb-2">Restricted Access</h1>
          <p className="text-muted-foreground mb-4">This page is restricted to administrators.</p>
          <Button asChild><Link to="/">Back</Link></Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-8 max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Site Settings</h1>
          <p className="text-muted-foreground text-sm">Global settings for how the app looks to everyone.</p>
        </div>

        <div className="surface-card p-6 space-y-4">
          <div>
            <h2 className="font-semibold">Sign-In Page Image</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Shown full-bleed on the right half of the sign-in page (desktop and tablet only — hidden on phones to
              keep the sign-in form front and center). Recommended: a tall image, at least 1000×1400px.
            </p>
          </div>

          <div className="rounded-lg border border-border overflow-hidden bg-muted/30 aspect-[3/4] max-w-xs flex items-center justify-center">
            {previewOk ? (
              <img src={preview} alt="Sign-in page preview" className="h-full w-full object-cover" onError={() => setPreviewOk(false)} />
            ) : (
              <>
                <img src={preview} alt="" className="hidden" onLoad={() => setPreviewOk(true)} />
                <div className="text-center text-muted-foreground text-sm p-4">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No image uploaded yet
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFilePicked} />
            <Button variant="outline" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
              {uploading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" />{previewOk ? "Replace Image" : "Upload Image"}</>
              )}
            </Button>
            {previewOk && (
              <Button variant="ghost" className="text-destructive" disabled={removing} onClick={removeImage}>
                <Trash2 className="h-4 w-4 mr-2" />Remove
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
