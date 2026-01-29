export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          org_id: string
          target_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          org_id: string
          target_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          org_id?: string
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      case_files: {
        Row: {
          case_id: string
          category: string
          created_at: string
          exception_reason: string | null
          file_key: string | null
          file_size: number
          id: string
          org_id: string
          status: Database["public"]["Enums"]["file_status"]
          updated_at: string
        }
        Insert: {
          case_id: string
          category: string
          created_at?: string
          exception_reason?: string | null
          file_key?: string | null
          file_size?: number
          id?: string
          org_id: string
          status?: Database["public"]["Enums"]["file_status"]
          updated_at?: string
        }
        Update: {
          case_id?: string
          category?: string
          created_at?: string
          exception_reason?: string | null
          file_key?: string | null
          file_size?: number
          id?: string
          org_id?: string
          status?: Database["public"]["Enums"]["file_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_files_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          client_id: string
          created_at: string
          current_step_index: number
          expires_at: string
          id: string
          org_id: string
          status: Database["public"]["Enums"]["case_status"]
          template_snapshot: Json
          token: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          current_step_index?: number
          expires_at?: string
          id?: string
          org_id: string
          status?: Database["public"]["Enums"]["case_status"]
          template_snapshot?: Json
          token: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          current_step_index?: number
          expires_at?: string
          id?: string
          org_id?: string
          status?: Database["public"]["Enums"]["case_status"]
          template_snapshot?: Json
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          assigned_lawyer_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          org_id: string
          phone: string | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
        }
        Insert: {
          assigned_lawyer_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          org_id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Update: {
          assigned_lawyer_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          org_id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_lawyer_id_fkey"
            columns: ["assigned_lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          org_id: string
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          org_id: string
          requester_id: string | null
          result_url: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          org_id: string
          requester_id?: string | null
          result_url?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          org_id?: string
          requester_id?: string | null
          result_url?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          org_id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          org_id: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          org_id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          plan_status: Database["public"]["Enums"]["plan_status"]
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          primary_color: string | null
          slug: string
          storage_used: number
          stripe_customer_id: string | null
          trial_ends_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          plan_status?: Database["public"]["Enums"]["plan_status"]
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          primary_color?: string | null
          slug: string
          storage_used?: number
          stripe_customer_id?: string | null
          trial_ends_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          plan_status?: Database["public"]["Enums"]["plan_status"]
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          primary_color?: string | null
          slug?: string
          storage_used?: number
          stripe_customer_id?: string | null
          trial_ends_at?: string | null
        }
        Relationships: []
      }
      plan_configs: {
        Row: {
          can_white_label: boolean
          max_admins: number
          max_clients: number
          max_storage_bytes: number
          plan: Database["public"]["Enums"]["plan_tier"]
        }
        Insert: {
          can_white_label?: boolean
          max_admins: number
          max_clients: number
          max_storage_bytes: number
          plan: Database["public"]["Enums"]["plan_tier"]
        }
        Update: {
          can_white_label?: boolean
          max_admins?: number
          max_clients?: number
          max_storage_bytes?: number
          plan?: Database["public"]["Enums"]["plan_tier"]
        }
        Relationships: []
      }
      portal_analytics: {
        Row: {
          case_id: string
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          step_index: number | null
          user_agent: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          step_index?: number | null
          user_agent?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          step_index?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_analytics_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          assigned_phone: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          org_id: string
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          assigned_phone?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          org_id: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          assigned_phone?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          key: string
          last_refill: string
          tokens: number
        }
        Insert: {
          key: string
          last_refill?: string
          tokens: number
        }
        Update: {
          key?: string
          last_refill?: string
          tokens?: number
        }
        Relationships: []
      }
      storage_delete_queue: {
        Row: {
          bucket_id: string
          created_at: string
          file_path: string
          id: string
          processed_at: string | null
          retry_count: number
          status: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          file_path: string
          id?: string
          processed_at?: string | null
          retry_count?: number
          status?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          file_path?: string
          id?: string
          processed_at?: string | null
          retry_count?: number
          status?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          org_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          created_at: string
          id: string
          org_id: string
          owner_id: string | null
          schema: Json
          scope: Database["public"]["Enums"]["template_scope"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          owner_id?: string | null
          schema?: Json
          scope?: Database["public"]["Enums"]["template_scope"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          owner_id?: string | null
          schema?: Json
          scope?: Database["public"]["Enums"]["template_scope"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_get_org_id: { Args: never; Returns: string }
      app_is_active: { Args: never; Returns: boolean }
      app_is_admin: { Args: never; Returns: boolean }
      check_rate_limit: {
        Args: {
          p_capacity: number
          p_cost: number
          p_key: string
          p_refill_rate_per_second: number
        }
        Returns: boolean
      }
      confirm_file_upload: {
        Args: { p_file_id: string; p_file_key: string; p_file_size: number }
        Returns: {
          case_id: string
          category: string
          created_at: string
          exception_reason: string | null
          file_key: string | null
          file_size: number
          id: string
          org_id: string
          status: Database["public"]["Enums"]["file_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "case_files"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      flag_file_exception: {
        Args: { p_file_id: string; p_reason: string; p_token: string }
        Returns: undefined
      }
      get_case_by_token: { Args: { p_token: string }; Returns: Json }
      get_invitation: {
        Args: { p_token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["invitation_status"]
        }[]
      }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          email: string
          org_name: string
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["invitation_status"]
        }[]
      }
      log_portal_access: {
        Args: {
          p_case_token: string
          p_event_type: string
          p_metadata?: Json
          p_step_index?: number
        }
        Returns: undefined
      }
      regenerate_case_token: { Args: { p_case_id: string }; Returns: string }
      remove_org_member: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_case_progress: {
        Args: { p_step_index: number; p_token: string }
        Returns: undefined
      }
      submit_questionnaire_answers: {
        Args: { p_token: string; p_answers: Json }
        Returns: undefined
      }
    }
    Enums: {
      case_status: "draft" | "in_progress" | "review" | "completed"
      client_status: "prospect" | "active" | "archived"
      file_status: "pending" | "uploaded" | "error"
      invitation_status: "pending" | "accepted" | "expired" | "revoked"
      plan_status: "active" | "trialing" | "past_due" | "canceled" | "paused"
      plan_tier: "trial" | "pro" | "enterprise" | "demo"
      subscription_status:
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "trialing"
        | "unpaid"
      template_scope: "private" | "global"
      user_role: "admin" | "member"
      user_status: "active" | "suspended" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      case_status: ["draft", "in_progress", "review", "completed"],
      client_status: ["prospect", "active", "archived"],
      file_status: ["pending", "uploaded", "error"],
      invitation_status: ["pending", "accepted", "expired", "revoked"],
      plan_status: ["active", "trialing", "past_due", "canceled", "paused"],
      plan_tier: ["trial", "pro", "enterprise", "demo"],
      subscription_status: [
        "active",
        "past_due",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "trialing",
        "unpaid",
      ],
      template_scope: ["private", "global"],
      user_role: ["admin", "member"],
      user_status: ["active", "suspended", "archived"],
    },
  },
} as const
