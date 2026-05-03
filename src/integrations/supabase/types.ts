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
      answers: {
        Row: {
          attempt_id: string
          awarded_points: number | null
          id: string
          question_id: string
          response: Json | null
        }
        Insert: {
          attempt_id: string
          awarded_points?: number | null
          id?: string
          question_id: string
          response?: Json | null
        }
        Update: {
          attempt_id?: string
          awarded_points?: number | null
          id?: string
          question_id?: string
          response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          evaluation_id: string
          id: string
          max_score: number | null
          score: number | null
          started_at: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          evaluation_id: string
          id?: string
          max_score?: number | null
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          evaluation_id?: string
          id?: string
          max_score?: number | null
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_blocks: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["content_kind"]
          meta: string | null
          module_id: string
          position: number
          section: string | null
          title: string
          url: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["content_kind"]
          meta?: string | null
          module_id: string
          position?: number
          section?: string | null
          title: string
          url?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["content_kind"]
          meta?: string | null
          module_id?: string
          position?: number
          section?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_blocks_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_color: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          group_label: string | null
          id: string
          instructor_name: string | null
          is_open: boolean
          offered_by: string | null
          start_date: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          cover_color?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          group_label?: string | null
          id?: string
          instructor_name?: string | null
          is_open?: boolean
          offered_by?: string | null
          start_date?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          cover_color?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          group_label?: string | null
          id?: string
          instructor_name?: string | null
          is_open?: boolean
          offered_by?: string | null
          start_date?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          mode: Database["public"]["Enums"]["eval_mode"]
          scheduled_at: string | null
          single_attempt: boolean
          title: string
          total_points: number
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          mode?: Database["public"]["Enums"]["eval_mode"]
          scheduled_at?: string | null
          single_attempt?: boolean
          title: string
          total_points?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          mode?: Database["public"]["Enums"]["eval_mode"]
          scheduled_at?: string | null
          single_attempt?: boolean
          title?: string
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          position: number
          start_date: string | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          position?: number
          start_date?: string | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          position?: number
          start_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel: {
        Row: {
          adresse: string | null
          created_at: string
          date_naissance: string | null
          email_institutionnel: string | null
          email_personnel: string | null
          id: string
          matricule: string | null
          mention: Database["public"]["Enums"]["mention_type"] | null
          mere: string | null
          niveau: Database["public"]["Enums"]["niveau_etude"] | null
          nom: string | null
          parcours: Database["public"]["Enums"]["parcours_type"] | null
          pere: string | null
          prenom: string | null
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          date_naissance?: string | null
          email_institutionnel?: string | null
          email_personnel?: string | null
          id: string
          matricule?: string | null
          mention?: Database["public"]["Enums"]["mention_type"] | null
          mere?: string | null
          niveau?: Database["public"]["Enums"]["niveau_etude"] | null
          nom?: string | null
          parcours?: Database["public"]["Enums"]["parcours_type"] | null
          pere?: string | null
          prenom?: string | null
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          created_at?: string
          date_naissance?: string | null
          email_institutionnel?: string | null
          email_personnel?: string | null
          id?: string
          matricule?: string | null
          mention?: Database["public"]["Enums"]["mention_type"] | null
          mere?: string | null
          niveau?: Database["public"]["Enums"]["niveau_etude"] | null
          nom?: string | null
          parcours?: Database["public"]["Enums"]["parcours_type"] | null
          pere?: string | null
          prenom?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          choices: Json | null
          correct: Json | null
          evaluation_id: string
          id: string
          kind: Database["public"]["Enums"]["question_kind"]
          points: number
          position: number
          prompt: string
        }
        Insert: {
          choices?: Json | null
          correct?: Json | null
          evaluation_id: string
          id?: string
          kind: Database["public"]["Enums"]["question_kind"]
          points?: number
          position?: number
          prompt: string
        }
        Update: {
          choices?: Json | null
          correct?: Json | null
          evaluation_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["question_kind"]
          points?: number
          position?: number
          prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_files: {
        Row: {
          created_at: string
          folder_id: string | null
          id: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "shared_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_folders: {
        Row: {
          audience: Database["public"]["Enums"]["share_audience"]
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          audience?: Database["public"]["Enums"]["share_audience"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          audience?: Database["public"]["Enums"]["share_audience"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "shared_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          motivation: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["signup_status"]
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          motivation?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["signup_status"]
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          motivation?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["signup_status"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      can_write_audience: {
        Args: {
          _audience: Database["public"]["Enums"]["share_audience"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      in_audience: {
        Args: {
          _audience: Database["public"]["Enums"]["share_audience"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "instructor" | "student" | "staff_admin"
      content_kind: "presentation" | "reading" | "link" | "text" | "video"
      eval_mode: "individual" | "group"
      mention_type:
        | "medecine_humaine"
        | "pharmacie"
        | "medecine_veterinaire"
        | "sciences_paramedicales"
      niveau_etude: "L1" | "L2" | "L3" | "A4" | "A5" | "A6" | "A7" | "A8"
      parcours_type:
        | "anesthesie"
        | "maieutique"
        | "infirmier_generaliste"
        | "massokinesitherapie"
        | "ergotherapie"
        | "technique_appareillage"
        | "technique_laboratoire"
        | "electroradiologie"
      question_kind:
        | "mcq_single"
        | "mcq_multi"
        | "true_false"
        | "short"
        | "long"
      share_audience: "teachers" | "students" | "staff_admin" | "all"
      signup_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "instructor", "student", "staff_admin"],
      content_kind: ["presentation", "reading", "link", "text", "video"],
      eval_mode: ["individual", "group"],
      mention_type: [
        "medecine_humaine",
        "pharmacie",
        "medecine_veterinaire",
        "sciences_paramedicales",
      ],
      niveau_etude: ["L1", "L2", "L3", "A4", "A5", "A6", "A7", "A8"],
      parcours_type: [
        "anesthesie",
        "maieutique",
        "infirmier_generaliste",
        "massokinesitherapie",
        "ergotherapie",
        "technique_appareillage",
        "technique_laboratoire",
        "electroradiologie",
      ],
      question_kind: ["mcq_single", "mcq_multi", "true_false", "short", "long"],
      share_audience: ["teachers", "students", "staff_admin", "all"],
      signup_status: ["pending", "approved", "rejected"],
    },
  },
} as const
