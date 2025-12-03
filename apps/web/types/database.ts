export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: string | null;
          created_at: string;
          updated_at: string;
          onboarding_step: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: string | null;
          onboarding_step?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          role?: string | null;
          onboarding_step?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      questionnaire_responses: {
        Row: {
          id: string;
          profile_id: string;
          step: string;
          responses: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          step: string;
          responses: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          step?: string;
          responses?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      job_listings: {
        Row: {
          id: string;
          title: string;
          description: string;
          company: string;
          tags: string[] | null;
          seniority: string | null;
          employment_type: string | null;
          location: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          company: string;
          tags?: string[] | null;
          seniority?: string | null;
          employment_type?: string | null;
          location?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          company?: string;
          tags?: string[] | null;
          seniority?: string | null;
          employment_type?: string | null;
          location?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      job_applications: {
        Row: {
          id: string;
          profile_id: string;
          job_listing_id: string;
          status: string;
          match_score: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          job_listing_id: string;
          status?: string;
          match_score?: number | null;
          created_at?: string;
        };
        Update: {
          profile_id?: string;
          job_listing_id?: string;
          status?: string;
          match_score?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_applications_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_applications_job_listing_id_fkey";
            columns: ["job_listing_id"];
            referencedRelation: "job_listings";
            referencedColumns: ["id"];
          }
        ];
      };
    };
  };
}