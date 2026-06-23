import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file") as unknown as File | null;
    if (!file || typeof file === "string") {
      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400 });
    }

    const supabase = await createServerSupabase();
    const filename = `${crypto.randomUUID()}-${String((file as any).name ?? "upload")}`;

    // Read file into buffer
    const arrayBuffer = await (file as any).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabase.storage.from("uploads").upload(filename, buffer, {
      contentType: (file as any).type || "application/octet-stream",
      upsert: false
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from("uploads").getPublicUrl(filename);

    return new Response(JSON.stringify({ url: publicUrl }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Upload failed" }), { status: 500 });
  }
}
