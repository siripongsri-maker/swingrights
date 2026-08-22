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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      case_access_log: {
        Row: {
          action: string
          actor: string
          case_code: string | null
          case_id: string | null
          created_at: string
          detail: string | null
          id: string
        }
        Insert: {
          action: string
          actor?: string
          case_code?: string | null
          case_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor?: string
          case_code?: string | null
          case_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
        }
        Relationships: []
      }
      case_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          branch: string | null
          case_code: string
          case_id: string | null
          created_at: string
          id: string
          kind: string
          level: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          branch?: string | null
          case_code: string
          case_id?: string | null
          created_at?: string
          id?: string
          kind: string
          level: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          branch?: string | null
          case_code?: string
          case_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          level?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_alerts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_audit: {
        Row: {
          action: string
          actor: string | null
          case_code: string | null
          case_id: string | null
          changed_fields: string[]
          created_at: string
          id: string
        }
        Insert: {
          action: string
          actor?: string | null
          case_code?: string | null
          case_id?: string | null
          changed_fields?: string[]
          created_at?: string
          id?: string
        }
        Update: {
          action?: string
          actor?: string | null
          case_code?: string | null
          case_id?: string | null
          changed_fields?: string[]
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      case_exports: {
        Row: {
          case_code: string | null
          case_id: string | null
          created_at: string
          exported_by: string
          format: string
          id: string
        }
        Insert: {
          case_code?: string | null
          case_id?: string | null
          created_at?: string
          exported_by?: string
          format: string
          id?: string
        }
        Update: {
          case_code?: string | null
          case_id?: string | null
          created_at?: string
          exported_by?: string
          format?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_exports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_pii: {
        Row: {
          case_id: string
          created_at: string
          reporter: Json | null
          updated_at: string
          victim: Json | null
        }
        Insert: {
          case_id: string
          created_at?: string
          reporter?: Json | null
          updated_at?: string
          victim?: Json | null
        }
        Update: {
          case_id?: string
          created_at?: string
          reporter?: Json | null
          updated_at?: string
          victim?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "case_pii_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_questions: {
        Row: {
          answer_audio_url: string | null
          answer_text: string | null
          answered_at: string | null
          asked_by: string | null
          case_id: string
          created_at: string
          id: string
          question: string
          updated_at: string
        }
        Insert: {
          answer_audio_url?: string | null
          answer_text?: string | null
          answered_at?: string | null
          asked_by?: string | null
          case_id: string
          created_at?: string
          id?: string
          question: string
          updated_at?: string
        }
        Update: {
          answer_audio_url?: string | null
          answer_text?: string | null
          answered_at?: string | null
          asked_by?: string | null
          case_id?: string
          created_at?: string
          id?: string
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_questions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_timeline: {
        Row: {
          audio_url: string | null
          case_id: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          status: string
        }
        Insert: {
          audio_url?: string | null
          case_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          status: string
        }
        Update: {
          audio_url?: string | null
          case_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_timeline_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          ai_result: Json | null
          ai_reviewed: boolean
          ai_reviewed_at: string | null
          ai_reviewed_by: string | null
          answers: Json | null
          assigned_to: string | null
          audio_urls: Json
          case_code: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          extra_facts: string | null
          follow_up_at: string | null
          has_violation: boolean | null
          id: string
          photo_urls: Json
          profile: Json | null
          referral_note: string | null
          referrals: Json | null
          report_language: string
          reporter: Json | null
          screening: Json
          severity: string | null
          signature_client: string | null
          signature_staff: string | null
          signature_staff_name: string | null
          signed_at: string | null
          source: string
          special_tests: Json | null
          staff_observations: Json | null
          status: string
          suicide_risk: boolean
          updated_at: string
          victim: Json | null
          violation_details: Json | null
          violation_types: Json | null
        }
        Insert: {
          ai_result?: Json | null
          ai_reviewed?: boolean
          ai_reviewed_at?: string | null
          ai_reviewed_by?: string | null
          answers?: Json | null
          assigned_to?: string | null
          audio_urls?: Json
          case_code: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          extra_facts?: string | null
          follow_up_at?: string | null
          has_violation?: boolean | null
          id?: string
          photo_urls?: Json
          profile?: Json | null
          referral_note?: string | null
          referrals?: Json | null
          report_language?: string
          reporter?: Json | null
          screening?: Json
          severity?: string | null
          signature_client?: string | null
          signature_staff?: string | null
          signature_staff_name?: string | null
          signed_at?: string | null
          source?: string
          special_tests?: Json | null
          staff_observations?: Json | null
          status?: string
          suicide_risk?: boolean
          updated_at?: string
          victim?: Json | null
          violation_details?: Json | null
          violation_types?: Json | null
        }
        Update: {
          ai_result?: Json | null
          ai_reviewed?: boolean
          ai_reviewed_at?: string | null
          ai_reviewed_by?: string | null
          answers?: Json | null
          assigned_to?: string | null
          audio_urls?: Json
          case_code?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          extra_facts?: string | null
          follow_up_at?: string | null
          has_violation?: boolean | null
          id?: string
          photo_urls?: Json
          profile?: Json | null
          referral_note?: string | null
          referrals?: Json | null
          report_language?: string
          reporter?: Json | null
          screening?: Json
          severity?: string | null
          signature_client?: string | null
          signature_staff?: string | null
          signature_staff_name?: string | null
          signed_at?: string | null
          source?: string
          special_tests?: Json | null
          staff_observations?: Json | null
          status?: string
          suicide_risk?: boolean
          updated_at?: string
          victim?: Json | null
          violation_details?: Json | null
          violation_types?: Json | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket: string
          created_at: string
          id: number
          ident: string
        }
        Insert: {
          bucket: string
          created_at?: string
          id?: number
          ident: string
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: number
          ident?: string
        }
        Relationships: []
      }
      referral_partners: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          district: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          org_type: string
          phone: string | null
          province: string | null
          services: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          org_type?: string
          phone?: string | null
          province?: string | null
          services?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_type?: string
          phone?: string | null
          province?: string | null
          services?: Json
          updated_at?: string
        }
        Relationships: []
      }
      staff_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          status: string
          suspended_at: string | null
          suspended_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      answer_case_question: {
        Args: {
          _answer_audio_url?: string
          _answer_text: string
          _case_code: string
          _question_id: string
        }
        Returns: undefined
      }
      can_edit_case: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage: { Args: { _user_id: string }; Returns: boolean }
      check_rate_limit: {
        Args: {
          _bucket: string
          _ident: string
          _limit: number
          _window_seconds: number
        }
        Returns: boolean
      }
      dashboard_stats: { Args: { _branch?: string }; Returns: Json }
      ensure_staff_profile: {
        Args: { _display_name?: string }
        Returns: undefined
      }
      gen_case_code: { Args: never; Returns: string }
      get_case_pii: { Args: { _case_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_staff: { Args: { _user_id: string }; Returns: boolean }
      log_case_access: {
        Args: { _action: string; _case_id: string; _detail?: string }
        Returns: undefined
      }
      mask_name: { Args: { _name: string }; Returns: string }
      my_access: { Args: never; Returns: Json }
      submit_case: { Args: { _payload: Json }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "staff" | "manager" | "caseworker" | "viewer"
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
      app_role: ["admin", "staff", "manager", "caseworker", "viewer"],
    },
  },
} as const
