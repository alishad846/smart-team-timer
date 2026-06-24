import { createClient } from "@supabase/supabase-js";
const supabase = createClient("https://this-domain-does-not-exist-12345.supabase.co", "sb_publishable_x7XDNZE-1HkV5GYQ-1wbpg_mpKIwExs");

async function test() {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "manager@company.com",
      password: "password123",
    });
    console.log("Response:", { data, error });
  } catch (err) {
    console.error("Caught error:", err);
  }
}

test();
