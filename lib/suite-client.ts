"use client";
import { createClient } from "@supabase/supabase-js";

// Publishable project configuration: access is enforced by database policies.
export const suiteClient = createClient(
  process.env.NEXT_PUBLIC_SUITE_SUPABASE_URL || "https://frvkibbrbxiqrlmlfnxc.supabase.co",
  process.env.NEXT_PUBLIC_SUITE_SUPABASE_KEY || "sb_publishable_XF2GLtgzOp6LST8QgB_-Yw_Kg9TKGp8",
  { auth: { storageKey: "olympus-suite-auth-v1", detectSessionInUrl: false } },
);
