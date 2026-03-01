"use server";

import { createClient } from "@/lib/supabase/server";
import { signupSchema, loginSchema } from "@/lib/schemas/auth";
import { updateProfileSchema } from "@/lib/schemas/backend-contracts";
import { handleError, ERROR_CODES } from "@/lib/utils/error-handler";
import { Result } from "@/types";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Admin Client for Atomic Operations (Service Role)
// used to clean up if things go wrong or to set up initial data regardless of RLS
const getAdminClient = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined");
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

export async function signupWithOrgAction(
  prevState: any,
  formData: FormData
): Promise<Result<void>> {
  const rawData = Object.fromEntries(formData);
  const parse = signupSchema.safeParse(rawData);

  if (!parse.success) {
    return {
      success: false,
      error: "Datos inválidos",
      code: ERROR_CODES.VAL_INVALID_INPUT,
      validationErrors: parse.error.flatten().fieldErrors,
    };
  }

  const { email, password, full_name, org_name } = parse.data;
  const supabase = await createClient();
  const admin = getAdminClient();

  // 1. Sign Up User (Triggers handle_new_user -> creates Profile)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        // We pass org_name in metadata so standard triggers could potentially use it,
        // though we allow manual handling here for robustness.
        org_name, 
      },
    },
  });

  if (authError) {
    return handleError(authError);
  }

  if (!authData.user) {
    return {
      success: false,
      error: "No se pudo crear el usuario",
      code: ERROR_CODES.SYS_INTERNAL_ERROR,
    };
  }

  const userId = authData.user.id;

  try {
    // 2. Create Organization (Atomic Step)
    // We use admin client to bypass RLS in case the user is not confirmed yet.
    // slug generation: simple sanitize for now.
    const slug = org_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).substring(2, 7);

    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({
        name: org_name,
        slug: slug,
        plan_tier: "trial",
        plan_status: "trialing",
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days trial
      })
      .select("id")
      .single();

    if (orgError) {
      throw orgError;
    }

    // 3. Link Org to Profile & Make Owner
    // The Postgres Trigger `handle_new_user` has already created the profile row.
    // Changing from `upsert` to `update` prevents race condition errors on the primary key constraint.
    // The founder gets 'owner' — a dedicated role distinct from secondary admins.
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        org_id: org.id,
        role: "owner",
        status: "active",
        full_name: full_name,
      })
      .eq("id", userId)
      .select()
      .single();

    if (profileError) {
      throw profileError;
    }

    // 4. Metadata Sync is now automatic via Trigger 'tr_sync_claims' on 'profiles' table.

  } catch (error) {
    console.error("Atomic Cleanup: Signup Failed, deleting user", error);
    // Cleanup: Delete the user if org setup failed (Atomic Rollback)
    await admin.auth.admin.deleteUser(userId);
    return handleError(error);
  }

  // 4. Success
  // If email confirmation is off, they are logged in.
  // If on, they need to check email.
  // We can redirect or return success. Assuming redirect for flow.
  // But strictly, actions return Result<T>.
  // We will return success and let the UI handle redirect or message.
  return { success: true, data: undefined };
}

export async function loginAction(
  prevState: any,
  formData: FormData
): Promise<Result<void>> {
    const rawData = Object.fromEntries(formData);
    const parse = loginSchema.safeParse(rawData);

    if (!parse.success) {
        return {
            success: false,
            error: "Datos inválidos",
            code: ERROR_CODES.VAL_INVALID_INPUT,
            validationErrors: parse.error.flatten().fieldErrors,
        };
    }

    const { email, password } = parse.data;
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return handleError(error);
    }

    return { success: true, data: undefined };
}

export async function logoutAction() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
}

export async function forgotPasswordAction(
  prevState: any,
  formData: FormData
): Promise<Result<void>> {
  const email = formData.get("email") as string;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      success: false,
      error: "Por favor ingresa un email válido",
      code: ERROR_CODES.VAL_INVALID_INPUT,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/actualizar-password`,
  });

  if (error) {
    return handleError(error);
  }

  // Always return success to avoid email enumeration attacks
  return { success: true, data: undefined };
}

export async function updatePasswordAction(
  prevState: any,
  formData: FormData
): Promise<Result<void>> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!password || password.length < 6) {
    return {
      success: false,
      error: "La contraseña debe tener al menos 6 caracteres",
      code: ERROR_CODES.VAL_INVALID_INPUT,
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      error: "Las contraseñas no coinciden",
      code: ERROR_CODES.VAL_INVALID_INPUT,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return handleError(error);
  }

  revalidatePath("/perfil");
  return { success: true, data: undefined };
}

export async function updateProfileAction(
  prevState: any,
  formData: FormData
): Promise<Result<any>> {
    const rawData = Object.fromEntries(formData);
    const parse = updateProfileSchema.safeParse(rawData);

    if (!parse.success) {
        return {
            success: false,
            error: "Datos inválidos",
            code: ERROR_CODES.VAL_INVALID_INPUT,
            validationErrors: parse.error.flatten().fieldErrors,
        };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
         return { success: false, error: "No autorizado", code: ERROR_CODES.AUTH_UNAUTHORIZED };
    }

    const { error, data: updatedProfile } = await supabase
        .from("profiles")
        .update(parse.data)
        .eq("id", user.id)
        .select()
        .single();

    if (error) {
        return handleError(error);
    }
    
    revalidatePath("/perfil");
    return { success: true, data: updatedProfile };
}
