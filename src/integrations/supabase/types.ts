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
      access_reviews: {
        Row: {
          created_at: string
          id: string
          month: string
          reviewed_at: string
          reviewed_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          reviewed_at?: string
          reviewed_by?: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          reviewed_at?: string
          reviewed_by?: string
        }
        Relationships: []
      }
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
      case_drafts: {
        Row: {
          case_id: string | null
          created_at: string
          data: Json
          id: string
          language: string
          media: Json
          source: string
          submitted_at: string | null
          token_hash: string
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          data?: Json
          id: string
          language?: string
          media?: Json
          source?: string
          submitted_at?: string | null
          token_hash: string
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          language?: string
          media?: Json
          source?: string
          submitted_at?: string | null
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_drafts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_exports: {
        Row: {
          case_code: string | null
          case_id: string | null
          created_at: string
          detail: string | null
          exported_by: string
          format: string
          id: string
        }
        Insert: {
          case_code?: string | null
          case_id?: string | null
          created_at?: string
          detail?: string | null
          exported_by?: string
          format: string
          id?: string
        }
        Update: {
          case_code?: string | null
          case_id?: string | null
          created_at?: string
          detail?: string | null
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
      case_referrals: {
        Row: {
          accept_token: string | null
          accepted_at: string | null
          case_id: string
          id: string
          note: string | null
          outcome: string
          partner_id: string
          referred_at: string
          referred_by: string | null
          responded_at: string | null
          summary: string | null
          token_expires_at: string | null
        }
        Insert: {
          accept_token?: string | null
          accepted_at?: string | null
          case_id: string
          id?: string
          note?: string | null
          outcome?: string
          partner_id: string
          referred_at?: string
          referred_by?: string | null
          responded_at?: string | null
          summary?: string | null
          token_expires_at?: string | null
        }
        Update: {
          accept_token?: string | null
          accepted_at?: string | null
          case_id?: string
          id?: string
          note?: string | null
          outcome?: string
          partner_id?: string
          referred_at?: string
          referred_by?: string | null
          responded_at?: string | null
          summary?: string | null
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_referrals_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_referrals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
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
          document_drafts: Json
          escalation_level: string | null
          escalation_sent_at: string | null
          extra_facts: string | null
          first_response_at: string | null
          first_response_by: string | null
          follow_up_at: string | null
          has_violation: boolean | null
          id: string
          photo_urls: Json
          pii_flag: boolean
          profile: Json | null
          referral_note: string | null
          referrals: Json | null
          report_language: string
          reporter: Json | null
          response_sla_met: boolean | null
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
          used_emergency_fund: boolean
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
          document_drafts?: Json
          escalation_level?: string | null
          escalation_sent_at?: string | null
          extra_facts?: string | null
          first_response_at?: string | null
          first_response_by?: string | null
          follow_up_at?: string | null
          has_violation?: boolean | null
          id?: string
          photo_urls?: Json
          pii_flag?: boolean
          profile?: Json | null
          referral_note?: string | null
          referrals?: Json | null
          report_language?: string
          reporter?: Json | null
          response_sla_met?: boolean | null
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
          used_emergency_fund?: boolean
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
          document_drafts?: Json
          escalation_level?: string | null
          escalation_sent_at?: string | null
          extra_facts?: string | null
          first_response_at?: string | null
          first_response_by?: string | null
          follow_up_at?: string | null
          has_violation?: boolean | null
          id?: string
          photo_urls?: Json
          pii_flag?: boolean
          profile?: Json | null
          referral_note?: string | null
          referrals?: Json | null
          report_language?: string
          reporter?: Json | null
          response_sla_met?: boolean | null
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
          used_emergency_fund?: boolean
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
      site_visits: {
        Row: {
          id: string
          path: string
          session_id: string
          visited_at: string
        }
        Insert: {
          id?: string
          path: string
          session_id: string
          visited_at?: string
        }
        Update: {
          id?: string
          path?: string
          session_id?: string
          visited_at?: string
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
      access_review: {
        Args: { _month: string }
        Returns: {
          case_views: number
          exports: number
          last_activity: string
          last_login: string
          name_masked: string
          roles: string[]
          status: string
          user_id: string
        }[]
      }
      answer_case_question: {
        Args: {
          _answer_audio_url?: string
          _answer_text: string
          _case_code: string
          _question_id: string
        }
        Returns: undefined
      }
      can_access_case_file: {
        Args: { _bucket: string; _name: string; _user_id: string }
        Returns: boolean
      }
      can_edit_case: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage: { Args: { _user_id: string }; Returns: boolean }
      case_id_for_file: {
        Args: { _bucket: string; _name: string }
        Returns: string
      }
      check_rate_limit: {
        Args: {
          _bucket: string
          _ident: string
          _limit: number
          _window_seconds: number
        }
        Returns: boolean
      }
      create_case_referral: {
        Args: {
          _case_id: string
          _note?: string
          _partner_id: string
          _summary?: string
        }
        Returns: Json
      }
      dashboard_stats: {
        Args: { _branch?: string; _from?: string; _to?: string }
        Returns: Json
      }
      ensure_staff_profile: {
        Args: { _display_name?: string }
        Returns: undefined
      }
      finish_case_draft: {
        Args: { _case_code: string; _draft_id: string; _token: string }
        Returns: undefined
      }
      gen_case_code: { Args: never; Returns: string }
      get_case_draft: {
        Args: { _draft_id: string; _token: string }
        Returns: Json
      }
      get_case_pii: { Args: { _case_id: string }; Returns: Json }
      get_registered_user_count: { Args: never; Returns: number }
      get_site_stats: {
        Args: never
        Returns: {
          total_visits: number
          unique_visitors: number
        }[]
      }
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
      project_summary: {
        Args: { _branch?: string; _from: string; _to: string }
        Returns: Json
      }
      record_site_visit: {
        Args: { _path: string; _session_id: string }
        Returns: undefined
      }
      save_case_draft: {
        Args: {
          _data: Json
          _draft_id: string
          _language?: string
          _media: Json
          _source?: string
          _token: string
        }
        Returns: string
      }
      submit_case: { Args: { _payload: Json }; Returns: string }
      suppress_small: { Args: { _n: number }; Returns: Json }
      track_public_stats: { Args: never; Returns: Json }
      verify_cron_token: { Args: { _token: string }; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
