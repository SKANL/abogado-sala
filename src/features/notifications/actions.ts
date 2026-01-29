"use server";

import { createClient } from "@/lib/supabase/server";
import { notificationActionSchema } from "@/lib/schemas/backend-contracts";
import { handleError, ERROR_CODES } from "@/lib/utils/error-handler";
import { Result } from "@/types";
import { revalidatePath } from "next/cache";

export async function markNotificationReadAction(notificationIds: string[]): Promise<Result<void>> {
    const parse = notificationActionSchema.safeParse({ ids: notificationIds });

    if (!parse.success) {
        return {
            success: false,
            error: "IDs inválidos",
            code: ERROR_CODES.VAL_INVALID_INPUT,
            validationErrors: parse.error.flatten().fieldErrors,
        };
    }

    const supabase = await createClient();
    const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", parse.data.ids); // RLS ensures ownership

    if (error) {
        return handleError(error);
    }
    
    // No specific path to revalidate as notifications might appear globally
    // But usually in a notification center or header
    // Ideally user client component refreshes via router.refresh() or realtime
    return { success: true, data: undefined };
}
