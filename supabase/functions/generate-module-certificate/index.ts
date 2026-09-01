import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { LOGO_BASE64 } from "./logo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData.user;
    if (!caller) {
      console.error("[cert] no caller — auth.getUser() returned null");
      return json({ error: "Not authenticated" }, 401);
    }
    console.error(`[cert] called by user ${caller.id}`);

    const { attempt_id } = await req.json();
    if (!attempt_id || typeof attempt_id !== "string") {
      console.error("[cert] missing attempt_id in request body");
      return json({ error: "Missing attempt_id" }, 400);
    }
    console.error(`[cert] attempt_id=${attempt_id}`);

    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch the attempt — must belong to the caller and be submitted.
    const { data: attempt, error: attemptErr } = await admin
      .from("attempts")
      .select("id, user_id, evaluation_id, submitted_at, score, max_score")
      .eq("id", attempt_id)
      .maybeSingle();
    if (attemptErr) {
      console.error(`[cert] attempt fetch error: ${attemptErr.message}`);
      return json({ error: attemptErr.message }, 500);
    }
    if (!attempt) {
      console.error("[cert] attempt not found");
      return json({ error: "Attempt not found" }, 404);
    }
    if (attempt.user_id !== caller.id) {
      console.error(`[cert] attempt belongs to ${attempt.user_id}, not caller ${caller.id}`);
      return json({ error: "This attempt does not belong to you" }, 403);
    }
    if (!attempt.submitted_at) {
      console.error("[cert] attempt not submitted yet");
      return json({ error: "Attempt not yet submitted" }, 400);
    }
    console.error(`[cert] attempt OK — evaluation_id=${attempt.evaluation_id} score=${attempt.score}/${attempt.max_score}`);

    const { data: evaluation, error: evalErr } = await admin
      .from("evaluations")
      .select("id, title, module_id")
      .eq("id", attempt.evaluation_id)
      .maybeSingle();
    if (evalErr) {
      console.error(`[cert] evaluation fetch error: ${evalErr.message}`);
      return json({ error: evalErr.message }, 500);
    }
    if (!evaluation) {
      console.error("[cert] evaluation not found");
      return json({ error: "Assessment not found" }, 404);
    }
    console.error(`[cert] evaluation "${evaluation.title}" module_id=${evaluation.module_id ?? "NULL"}`);

    if (!evaluation.module_id) {
      // Not a module-linked assessment — nothing to certify, not an error.
      console.error("[cert] STOP: evaluation has no module_id — not eligible for a certificate");
      return json({ issued: false, reason: "not_module_linked" });
    }

    // Idempotent: if a certificate already exists for this user+module,
    // just return it instead of generating a duplicate.
    const { data: existing } = await admin
      .from("module_certificates")
      .select("storage_path, issued_at")
      .eq("user_id", caller.id)
      .eq("module_id", evaluation.module_id)
      .maybeSingle();
    if (existing) {
      console.error(`[cert] STOP: certificate already exists at ${existing.storage_path}`);
      return json({ issued: true, already_existed: true, storage_path: existing.storage_path });
    }

    // A module can have several linked "knowledge" assessments. The
    // participant must complete ALL of them, and validates the module
    // when their SUMMED score across every one of them reaches 50% of the
    // SUMMED total points — not 50% on any single assessment individually.
    const { data: moduleEvals, error: moduleEvalsErr } = await admin
      .from("evaluations")
      .select("id")
      .eq("module_id", evaluation.module_id);
    if (moduleEvalsErr) {
      console.error(`[cert] moduleEvals fetch error: ${moduleEvalsErr.message}`);
      return json({ error: moduleEvalsErr.message }, 500);
    }

    const evalIds = (moduleEvals ?? []).map((e: any) => e.id);
    console.error(`[cert] module has ${evalIds.length} linked assessment(s): ${evalIds.join(", ")}`);
    if (evalIds.length === 0) {
      console.error("[cert] STOP: no evaluations linked to this module");
      return json({ issued: false, reason: "not_passing" });
    }

    // The participant's most recent submitted attempt counts for each
    // linked assessment.
    const { data: attempts, error: attemptsErr } = await admin
      .from("attempts")
      .select("evaluation_id, score, max_score, submitted_at")
      .eq("user_id", caller.id)
      .in("evaluation_id", evalIds)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false });
    if (attemptsErr) {
      console.error(`[cert] attempts fetch error: ${attemptsErr.message}`);
      return json({ error: attemptsErr.message }, 500);
    }

    const latestByEval = new Map<string, { score: number; max_score: number }>();
    for (const a of attempts ?? []) {
      if (!latestByEval.has(a.evaluation_id)) {
        latestByEval.set(a.evaluation_id, { score: Number(a.score ?? 0), max_score: Number(a.max_score ?? 0) });
      }
    }
    console.error(`[cert] found submitted attempts for ${latestByEval.size}/${evalIds.length} of the linked assessments`);

    // Every assessment linked to this module must have been attempted at
    // least once before the module can be validated.
    const allAttempted = evalIds.every((id: string) => latestByEval.has(id));
    if (!allAttempted) {
      console.error("[cert] STOP: not every linked assessment has a submitted attempt yet");
      return json({ issued: false, reason: "assessments_incomplete" });
    }

    let totalScore = 0;
    let totalMax = 0;
    for (const v of latestByEval.values()) {
      totalScore += v.score;
      totalMax += v.max_score;
    }
    console.error(`[cert] aggregate score = ${totalScore}/${totalMax}`);
    const passed = totalMax > 0 && totalScore / totalMax >= 0.5;
    if (!passed) {
      console.error("[cert] STOP: aggregate score below 50%");
      return json({ issued: false, reason: "not_passing" });
    }
    console.error("[cert] PASSED — generating certificate PDF");

    const { data: moduleRow } = await admin
      .from("modules")
      .select("title")
      .eq("id", evaluation.module_id)
      .maybeSingle();

    const { data: personnel } = await admin
      .from("personnel")
      .select("nom, prenom, parcours")
      .eq("id", caller.id)
      .maybeSingle();

    const countryLabels: Record<string, string> = {
      germany: "Germany",
      madagascar: "Madagascar",
      indonesia: "Indonesia",
    };

    const participantName = [personnel?.prenom, personnel?.nom].filter(Boolean).join(" ").trim() || caller.email || "Participant";
    const country = personnel?.parcours ? countryLabels[personnel.parcours] ?? personnel.parcours : "—";
    const moduleTitle = moduleRow?.title ?? "Module";

    const pdfBytes = await buildCertificatePdf({ participantName, country, moduleTitle });

    const storagePath = `${caller.id}/${evaluation.module_id}.pdf`;
    const { error: uploadErr } = await admin.storage
      .from("certificates")
      .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (uploadErr) {
      console.error(`[cert] storage upload error: ${uploadErr.message}`);
      return json({ error: uploadErr.message }, 500);
    }

    const { error: insertErr } = await admin.from("module_certificates").insert({
      user_id: caller.id,
      module_id: evaluation.module_id,
      evaluation_id: evaluation.id,
      attempt_id: attempt.id,
      storage_path: storagePath,
    });
    if (insertErr) {
      console.error(`[cert] module_certificates insert error: ${insertErr.message}`);
      return json({ error: insertErr.message }, 500);
    }

    console.error(`[cert] SUCCESS — certificate stored at ${storagePath}`);
    return json({ issued: true, already_existed: false, storage_path: storagePath });
  } catch (e) {
    console.error(`[cert] UNCAUGHT EXCEPTION: ${(e as Error).message}`);
    return json({ error: (e as Error).message }, 500);
  }
});

async function buildCertificatePdf(opts: { participantName: string; country: string; moduleTitle: string }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const logoBytes = base64ToBytes(LOGO_BASE64);
  const logoImage = await doc.embedPng(logoBytes);
  const logoW = 90;
  const logoH = (logoImage.height / logoImage.width) * logoW;
  page.drawImage(logoImage, { x: 50, y: height - 50 - logoH, width: logoW, height: logoH });

  const dark = rgb(0.12, 0.16, 0.22);
  const gray = rgb(0.4, 0.44, 0.5);

  const tagline = "A DAAD SDG-Partnerships Program on Sustainable Global Health";
  const italicFont = await doc.embedFont(StandardFonts.HelveticaOblique);
  page.drawText(tagline, {
    x: 50,
    y: height - 50 - logoH - 16,
    size: 9,
    font: italicFont,
    color: gray,
  });

  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  page.drawText(dateStr, {
    x: width - 50 - font.widthOfTextAtSize(dateStr, 11),
    y: height - 70,
    size: 11,
    font,
    color: gray,
  });

  let y = height - 50 - logoH - 80;

  const drawCentered = (text: string, size: number, useFont = font, color = dark) => {
    const w = useFont.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - w) / 2, y, size, font: useFont, color });
  };

  drawCentered("Concerne : Attestation de validation de module", 13, fontBold);
  y -= 50;

  const line = (label: string, value: string) => {
    const labelSize = 12;
    page.drawText(label, { x: 90, y, size: labelSize, font: fontBold, color: dark });
    const labelW = fontBold.widthOfTextAtSize(label, labelSize);
    page.drawText(value, { x: 90 + labelW + 6, y, size: labelSize, font, color: dark });
    y -= 34;
  };

  line("Nom du module :", opts.moduleTitle);
  line("Nom du participant :", opts.participantName);
  line("Pays d'origine :", opts.country);

  y -= 40;
  const bodyText =
    "Ce document atteste que le participant mentionné ci-dessus a validé avec succès " +
    "l'évaluation de connaissances associée à ce module, dans le cadre du programme " +
    "HEALTHY PATHS — The DAAD SDG-Partnerships Program on Sustainable Global Health.";
  const bodySize = 11;
  const maxWidth = width - 180;
  const words = bodyText.split(" ");
  let lineStr = "";
  for (const word of words) {
    const test = lineStr ? `${lineStr} ${word}` : word;
    if (font.widthOfTextAtSize(test, bodySize) > maxWidth) {
      page.drawText(lineStr, { x: 90, y, size: bodySize, font, color: gray });
      y -= 18;
      lineStr = word;
    } else {
      lineStr = test;
    }
  }
  if (lineStr) page.drawText(lineStr, { x: 90, y, size: bodySize, font, color: gray });

  // Footer / signature block
  const footerY = 130;
  page.drawLine({
    start: { x: 90, y: footerY + 40 },
    end: { x: width - 90, y: footerY + 40 },
    thickness: 0.5,
    color: rgb(0.85, 0.87, 0.9),
  });
  drawCenteredAt(page, font, "Attestation valable sans signature", 10, footerY, gray, width);
  drawCenteredAt(page, fontBold, "Le Comité Scientifique", 12, footerY - 20, dark, width);

  const lightGray = rgb(0.55, 0.58, 0.63);
  drawCenteredAt(
    page,
    font,
    "Université Syiah Kuala (Indonésie) · Université d'Antananarivo (Madagascar) · Université de Göttingen (Allemagne)",
    7.5,
    footerY - 45,
    lightGray,
    width,
  );
  drawCenteredAt(page, font, "the-healthypaths-project.org", 7.5, footerY - 58, lightGray, width);

  return doc.save();
}

function drawCenteredAt(page: any, font: any, text: string, size: number, y: number, color: any, pageWidth: number) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (pageWidth - w) / 2, y, size, font, color });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
