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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      derived_features: {
        Row: {
          completion_seconds: number | null
          created_at: string
          features: Json
          game_id: string
          game_version: string
          id: string
          n_errors: number | null
          n_events: number | null
          n_hints: number | null
          profile_id: string
          quality_flags: Json | null
          session_id: string
          skill_scores: Json | null
          updated_at: string
        }
        Insert: {
          completion_seconds?: number | null
          created_at?: string
          features?: Json
          game_id: string
          game_version?: string
          id?: string
          n_errors?: number | null
          n_events?: number | null
          n_hints?: number | null
          profile_id: string
          quality_flags?: Json | null
          session_id: string
          skill_scores?: Json | null
          updated_at?: string
        }
        Update: {
          completion_seconds?: number | null
          created_at?: string
          features?: Json
          game_id?: string
          game_version?: string
          id?: string
          n_errors?: number | null
          n_events?: number | null
          n_hints?: number | null
          profile_id?: string
          quality_flags?: Json | null
          session_id?: string
          skill_scores?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "derived_features_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "derived_features_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "view_behavioral_indices"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "derived_features_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_events: {
        Row: {
          event_name: string | null
          event_type: string
          id: number
          payload: Json | null
          profile_id: string
          session_id: string
          ts: string
        }
        Insert: {
          event_name?: string | null
          event_type: string
          id?: number
          payload?: Json | null
          profile_id: string
          session_id: string
          ts?: string
        }
        Update: {
          event_name?: string | null
          event_type?: string
          id?: number
          payload?: Json | null
          profile_id?: string
          session_id?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "view_behavioral_indices"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "game_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          created_at: string
          device: Json | null
          ended_at: string | null
          game_id: string
          game_version: string
          id: string
          metadata: Json | null
          profile_id: string
          role_context: string | null
          started_at: string
          status: string
          total_seconds: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          device?: Json | null
          ended_at?: string | null
          game_id: string
          game_version?: string
          id?: string
          metadata?: Json | null
          profile_id: string
          role_context?: string | null
          started_at?: string
          status?: string
          total_seconds?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          device?: Json | null
          ended_at?: string | null
          game_id?: string
          game_version?: string
          id?: string
          metadata?: Json | null
          profile_id?: string
          role_context?: string | null
          started_at?: string
          status?: string
          total_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "view_behavioral_indices"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      job_applications: {
        Row: {
          created_at: string
          id: string
          job_listing_id: string
          match_score: number | null
          profile_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_listing_id: string
          match_score?: number | null
          profile_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_listing_id?: string
          match_score?: number | null
          profile_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_listing_id_fkey"
            columns: ["job_listing_id"]
            isOneToOne: false
            referencedRelation: "job_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "view_behavioral_indices"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      job_listings: {
        Row: {
          company: string
          created_at: string
          description: string
          employment_type: string | null
          id: string
          is_active: boolean
          location: string | null
          role_target: string | null
          seniority: string | null
          tags: string[] | null
          title: string
        }
        Insert: {
          company: string
          created_at?: string
          description: string
          employment_type?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          role_target?: string | null
          seniority?: string | null
          tags?: string[] | null
          title: string
        }
        Update: {
          company?: string
          created_at?: string
          description?: string
          employment_type?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          role_target?: string | null
          seniority?: string | null
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      orientation_profiles: {
        Row: {
          confidence: number
          created_at: string
          role_scores: Json
          scores: Json
          suggested_role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          role_scores: Json
          scores: Json
          suggested_role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          role_scores?: Json
          scores?: Json
          suggested_role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          onboarding_step: string | null
          research_consent_at: string | null
          research_consent_given: boolean
          target_role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          onboarding_step?: string | null
          research_consent_at?: string | null
          research_consent_given?: boolean
          target_role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_step?: string | null
          research_consent_at?: string | null
          research_consent_given?: boolean
          target_role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      questionnaire_responses: {
        Row: {
          completion_seconds: number | null
          created_at: string
          id: string
          instrument_version: string
          profile_id: string
          responses: Json
          step: string
          updated_at: string
        }
        Insert: {
          completion_seconds?: number | null
          created_at?: string
          id?: string
          instrument_version?: string
          profile_id: string
          responses: Json
          step: string
          updated_at?: string
        }
        Update: {
          completion_seconds?: number | null
          created_at?: string
          id?: string
          instrument_version?: string
          profile_id?: string
          responses?: Json
          step?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_responses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "view_behavioral_indices"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      user_background: {
        Row: {
          age_group: string | null
          company_size: string | null
          created_at: string | null
          desired_seniority: string | null
          education_level: string | null
          employment_status: string | null
          field_of_study: string | null
          gender: string | null
          job_satisfaction: string | null
          main_motivation: string | null
          role_type: string | null
          sector: string | null
          updated_at: string | null
          user_id: string
          work_mode: string | null
          years_experience: string | null
        }
        Insert: {
          age_group?: string | null
          company_size?: string | null
          created_at?: string | null
          desired_seniority?: string | null
          education_level?: string | null
          employment_status?: string | null
          field_of_study?: string | null
          gender?: string | null
          job_satisfaction?: string | null
          main_motivation?: string | null
          role_type?: string | null
          sector?: string | null
          updated_at?: string | null
          user_id: string
          work_mode?: string | null
          years_experience?: string | null
        }
        Update: {
          age_group?: string | null
          company_size?: string | null
          created_at?: string | null
          desired_seniority?: string | null
          education_level?: string | null
          employment_status?: string | null
          field_of_study?: string | null
          gender?: string | null
          job_satisfaction?: string | null
          main_motivation?: string | null
          role_type?: string | null
          sector?: string | null
          updated_at?: string | null
          user_id?: string
          work_mode?: string | null
          years_experience?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      user_profile_view: {
        Row: {
          age_group: string | null
          company_size: string | null
          confidence: number | null
          desired_seniority: string | null
          education_level: string | null
          field_of_study: string | null
          gender: string | null
          gonogo_features: Json | null
          gonogo_quality_flags: Json | null
          gonogo_skill_scores: Json | null
          job_satisfaction: string | null
          main_motivation: string | null
          negotiation_features: Json | null
          negotiation_quality_flags: Json | null
          negotiation_skill_scores: Json | null
          orientation_scores: Json | null
          orientation_updated_at: string | null
          role_scores: Json | null
          role_type: string | null
          sector: string | null
          suggested_role: string | null
          triage_features: Json | null
          triage_quality_flags: Json | null
          triage_skill_scores: Json | null
          user_id: string | null
          work_mode: string | null
          years_experience: string | null
        }
        Relationships: []
      }
      view_behavioral_indices: {
        Row: {
          behavioral_global: number | null
          oi_score: number | null
          profile_id: string | null
          sdi_score: number | null
          sri_score: number | null
        }
        Relationships: []
      }
      view_oi: {
        Row: {
          oi_score: number | null
          profile_id: string | null
        }
        Insert: {
          oi_score?: never
          profile_id?: string | null
        }
        Update: {
          oi_score?: never
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "derived_features_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "derived_features_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "view_behavioral_indices"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      view_sdi: {
        Row: {
          profile_id: string | null
          sdi_score: number | null
        }
        Insert: {
          profile_id?: string | null
          sdi_score?: never
        }
        Update: {
          profile_id?: string | null
          sdi_score?: never
        }
        Relationships: [
          {
            foreignKeyName: "derived_features_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "derived_features_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "view_behavioral_indices"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      view_sri: {
        Row: {
          profile_id: string | null
          sri_score: number | null
        }
        Insert: {
          profile_id?: string | null
          sri_score?: never
        }
        Update: {
          profile_id?: string | null
          sri_score?: never
        }
        Relationships: [
          {
            foreignKeyName: "derived_features_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "derived_features_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "view_behavioral_indices"
            referencedColumns: ["profile_id"]
          },
        ]
      }
    }
    Functions: {
      compute_features_for_run: {
        Args: { p_run_id: string }
        Returns: undefined
      }
      job_match: {
        Args: { p_profile_id: string }
        Returns: {
          company: string
          employment_type: string
          job_id: string
          match_score: number
          seniority: string
          title: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
