import { createClient } from "@supabase/supabase-js";
import { getAccessLevel } from "./license";

export class ReadonlyAccessError extends Error {
  constructor() {
    super("หมดอายุทดลองใช้ · ไม่สามารถบันทึกได้ กรุณาซื้อ License");
    this.name = "ReadonlyAccessError";
  }
}

// เรียกที่ต้นทุก server action ที่เขียนข้อมูล
// ถ้า readonly → throw ReadonlyAccessError (caught by error boundary)
// ถ้า trial/full → ผ่านเลย
export async function requireWriteAccess(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const access = await getAccessLevel(supabase);
  if (access.level === "readonly") {
    throw new ReadonlyAccessError();
  }
}
