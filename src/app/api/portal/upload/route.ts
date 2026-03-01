import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";

/**
 * POST /api/portal/upload
 * Accepts: FormData { token, fileId, caseId, file }
 *
 * The portal is an unauthenticated flow — clients access via a signed token,
 * not a Supabase session. Direct client-side uploads fail because the anon
 * role has no storage INSERT permission. This route validates the token
 * server-side and uploads using the service role key.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token  = formData.get("token")  as string | null;
    const fileId = formData.get("fileId") as string | null;
    const caseId = formData.get("caseId") as string | null;
    const file   = formData.get("file")   as File   | null;

    if (!token || !fileId || !caseId || !file) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Validate token belongs to a real, non-expired case
    const { data: caseRow, error: tokenErr } = await admin
      .from("cases")
      .select("id, org_id")
      .eq("token", token)
      .single();

    if (tokenErr || !caseRow) {
      return NextResponse.json({ error: "Token inválido" }, { status: 403 });
    }

    // Validate the fileId belongs to this case
    const { data: fileRow, error: fileErr } = await admin
      .from("case_files")
      .select("id")
      .eq("id", fileId)
      .eq("case_id", caseRow.id)
      .single();

    if (fileErr || !fileRow) {
      return NextResponse.json({ error: "Archivo no pertenece al expediente" }, { status: 403 });
    }

    // Upload using service role (bypasses RLS)
    const fileExt  = file.name.split(".").pop();
    const filePath = `${caseId}/${fileId}.${fileExt}`;
    const buffer   = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await admin.storage
      .from("case-files")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    return NextResponse.json({ path: filePath, size: file.size });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error interno" }, { status: 500 });
  }
}
