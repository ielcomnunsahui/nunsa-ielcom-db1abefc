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
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          user_id: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          user_id?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      application_deadline: {
        Row: {
          created_at: string | null
          deadline: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          created_at?: string | null
          deadline: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          created_at?: string | null
          deadline?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      aspirant_positions: {
        Row: {
          application_fee: number
          created_at: string | null
          description: string | null
          display_order: number | null
          eligible_levels: string[]
          id: string
          is_open: boolean | null
          min_cgpa: number
          name: string
          updated_at: string | null
        }
        Insert: {
          application_fee: number
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          eligible_levels: string[]
          id?: string
          is_open?: boolean | null
          min_cgpa: number
          name: string
          updated_at?: string | null
        }
        Update: {
          application_fee?: number
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          eligible_levels?: string[]
          id?: string
          is_open?: boolean | null
          min_cgpa?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      aspirants: {
        Row: {
          admin_review_notes: string | null
          admin_review_status: string | null
          admin_reviewed_at: string | null
          admin_reviewed_by: string | null
          candidate_id: string | null
          cgpa: number
          conditional_acceptance: boolean | null
          conditional_reason: string | null
          created_at: string | null
          date_of_birth: string
          declaration_form_url: string | null
          department: string
          email: string
          full_name: string
          gender: string
          id: string
          leadership_history: string
          level: string
          matric: string
          payment_proof_url: string | null
          payment_verified: boolean | null
          payment_verified_at: string | null
          payment_verified_by: string | null
          phone: string
          photo_url: string | null
          position_id: string
          promoted_at: string | null
          promoted_to_candidate: boolean | null
          referee_form_url: string | null
          resubmission_deadline: string | null
          screening_notes: string | null
          screening_result: string | null
          screening_scheduled_at: string | null
          status: string
          updated_at: string | null
          why_running: string
        }
        Insert: {
          admin_review_notes?: string | null
          admin_review_status?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          candidate_id?: string | null
          cgpa: number
          conditional_acceptance?: boolean | null
          conditional_reason?: string | null
          created_at?: string | null
          date_of_birth: string
          declaration_form_url?: string | null
          department: string
          email: string
          full_name: string
          gender: string
          id?: string
          leadership_history: string
          level: string
          matric: string
          payment_proof_url?: string | null
          payment_verified?: boolean | null
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          phone: string
          photo_url?: string | null
          position_id: string
          promoted_at?: string | null
          promoted_to_candidate?: boolean | null
          referee_form_url?: string | null
          resubmission_deadline?: string | null
          screening_notes?: string | null
          screening_result?: string | null
          screening_scheduled_at?: string | null
          status?: string
          updated_at?: string | null
          why_running: string
        }
        Update: {
          admin_review_notes?: string | null
          admin_review_status?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          candidate_id?: string | null
          cgpa?: number
          conditional_acceptance?: boolean | null
          conditional_reason?: string | null
          created_at?: string | null
          date_of_birth?: string
          declaration_form_url?: string | null
          department?: string
          email?: string
          full_name?: string
          gender?: string
          id?: string
          leadership_history?: string
          level?: string
          matric?: string
          payment_proof_url?: string | null
          payment_verified?: boolean | null
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          phone?: string
          photo_url?: string | null
          position_id?: string
          promoted_at?: string | null
          promoted_to_candidate?: boolean | null
          referee_form_url?: string | null
          resubmission_deadline?: string | null
          screening_notes?: string | null
          screening_result?: string | null
          screening_scheduled_at?: string | null
          status?: string
          updated_at?: string | null
          why_running?: string
        }
        Relationships: [
          {
            foreignKeyName: "aspirants_admin_reviewed_by_fkey"
            columns: ["admin_reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aspirants_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aspirants_payment_verified_by_fkey"
            columns: ["payment_verified_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aspirants_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "aspirant_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          actor_id: string | null
          created_at: string | null
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      candidates: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          picture_url: string | null
          position: string
          vote_count: number | null
          manifesto: string | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: string
          picture_url?: string | null
          position: string
          vote_count?: number | null
          manifesto: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          picture_url?: string | null
          position?: string
          vote_count?: number | null
          manifesto: string | null
        }
        Relationships: []
      }
      election_timeline: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          is_active: boolean | null
          stage_name: string
          start_time: string
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          stage_name: string
          start_time: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          stage_name?: string
          start_time?: string
        }
        Relationships: []
      }
      issuance_log: {
        Row: {
          id: string
          issuance_token: string
          issued_at: string | null
          voter_id: string | null
        }
        Insert: {
          id?: string
          issuance_token: string
          issued_at?: string | null
          voter_id?: string | null
        }
        Update: {
          id?: string
          issuance_token?: string
          issued_at?: string | null
          voter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issuance_log_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "voters"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_instructions: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      positions: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          max_selections: number | null
          name: string
          vote_type: Database["public"]["Enums"]["vote_type"] | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          max_selections?: number | null
          name: string
          vote_type?: Database["public"]["Enums"]["vote_type"] | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          max_selections?: number | null
          name?: string
          vote_type?: Database["public"]["Enums"]["vote_type"] | null
        }
        Relationships: []
      }
      student_roster: {
        Row: {
          created_at: string | null
          id: string
          matric: string
          name: string
          level: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          matric: string
          name: string
          level: string
        }
        Update: {
          created_at?: string | null
          id?: string
          matric?: string
          name?: string
          level?: string
        }
        Relationships: []
      }
      voter_biometric: {
        Row: {
          counter: number | null
          created_at: string | null
          credential_id: string
          id: string
          public_key: string
          voter_id: string | null
        }
        Insert: {
          counter?: number | null
          created_at?: string | null
          credential_id: string
          id?: string
          public_key: string
          voter_id?: string | null
        }
        Update: {
          counter?: number | null
          created_at?: string | null
          credential_id?: string
          id?: string
          public_key?: string
          voter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voter_biometric_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: true
            referencedRelation: "voters"
            referencedColumns: ["id"]
          },
        ]
      }
      voter_otp: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          otp_code: string
          verified: boolean | null
          voter_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          otp_code: string
          verified?: boolean | null
          voter_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          otp_code?: string
          verified?: boolean | null
          voter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voter_otp_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "voters"
            referencedColumns: ["id"]
          },
        ]
      }
      voters: {
        Row: {
          created_at: string | null
          email: string
          id: string
          issuance_token: string | null
          matric: string
          name: string
          updated_at: string | null
          verified: boolean | null
          voted: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          issuance_token?: string | null
          matric: string
          name: string
          updated_at?: string | null
          verified?: boolean | null
          voted?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          issuance_token?: string | null
          matric?: string
          name?: string
          updated_at?: string | null
          verified?: boolean | null
          voted?: boolean | null
        }
        Relationships: []
      }
      votes: {
        Row: {
          candidate_id: string | null
          created_at: string | null
          id: string
          issuance_token: string
          position: string
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          issuance_token: string
          position: string
        }
        Update: {
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          issuance_token?: string
          position?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_vote_count: {
        Args: { candidate_id: string }
        Returns: undefined
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_voter_owner: {
        Args: { _user_id: string; _voter_id: string }
        Returns: boolean
      }
    }
    Enums: {
      election_stage: "registration" | "voting" | "closed" | "results_published"
      vote_type: "single" | "multiple"
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
      election_stage: ["registration", "voting", "closed", "results_published"],
      vote_type: ["single", "multiple"],
    },
  },
} as const
