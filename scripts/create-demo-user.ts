
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const EMAIL = "abogado.tester@zentyar.com";
const PASSWORD = "Password123!"; // Simple password for test
const FULL_NAME = "Abogado Tester";
const ORG_NAME = "Despacho Tester";

async function main() {
  console.log(`Creating user: ${EMAIL}`);

    // 1. Create User
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
        full_name: FULL_NAME,
        org_name: ORG_NAME,
        email_verified: true, // Important for our recent fix
        phone_verified: false
    }
  });

  if (userError) {
    console.error("Error creating user:", userError);
    return;
  }

  const user = userData.user;
  console.log("User created:", user.id);

  // 2. Create Organization
  const slug = ORG_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.random().toString(36).substring(2, 7);
  
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: ORG_NAME,
      slug: slug,
      plan_tier: "trial",
      plan_status: "trialing",
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (orgError) {
      console.error("Error creating org:", orgError);
      // Cleanup
      await supabase.auth.admin.deleteUser(user.id);
      return;
  }
  
  console.log("Organization created:", org.id);

  // 3. Create Profile (Link User to Org)
  const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        org_id: org.id,
        role: "admin",
        status: "active",
        full_name: FULL_NAME,
      });

    if (profileError) {
        console.error("Error creating profile:", profileError);
        return;
    }

    console.log("Profile created and linked.");
    console.log("------------------------------------------------");
    console.log("CREDENTIALS:");
    console.log(`Email: ${EMAIL}`);
    console.log(`Password: ${PASSWORD}`);
    console.log("------------------------------------------------");
}

main();
