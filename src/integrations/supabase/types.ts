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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      availability: {
        Row: {
          enabled: boolean
          ends_at: string
          id: string
          starts_at: string
        }
        Insert: {
          enabled?: boolean
          ends_at: string
          id?: string
          starts_at: string
        }
        Update: {
          enabled?: boolean
          ends_at?: string
          id?: string
          starts_at?: string
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          config: Json
          id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          request_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          request_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          request_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          percent: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          percent: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          percent?: number
        }
        Relationships: []
      }
      form_rate_limits: {
        Row: {
          attempts: number
          key: string
          window_started: string
        }
        Insert: {
          attempts?: number
          key: string
          window_started?: string
        }
        Update: {
          attempts?: number
          key?: string
          window_started?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string
          city: string
          full_name: string
          id: string
          phone: string
          photo_path: string
          postal_code: string
          updated_at: string
        }
        Insert: {
          address?: string
          city?: string
          full_name?: string
          id: string
          phone?: string
          photo_path?: string
          postal_code?: string
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          full_name?: string
          id?: string
          phone?: string
          photo_path?: string
          postal_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_requests: {
        Row: {
          address: string
          amount: number | null
          attachments: Json
          base_amount: number | null
          booking_period: unknown
          city: string
          created_at: string
          customer_name: string
          details: Json
          discount_code: string | null
          discount_percent: number
          email: string
          id: string
          internal_notes: string
          kind: string
          payment_method: string
          payment_status: string
          phone: string
          postal_code: string
          slot_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          address?: string
          amount?: number | null
          attachments?: Json
          base_amount?: number | null
          booking_period?: unknown
          city: string
          created_at?: string
          customer_name: string
          details?: Json
          discount_code?: string | null
          discount_percent?: number
          email: string
          id?: string
          internal_notes?: string
          kind?: string
          payment_method?: string
          payment_status?: string
          phone: string
          postal_code: string
          slot_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          amount?: number | null
          attachments?: Json
          base_amount?: number | null
          booking_period?: unknown
          city?: string
          created_at?: string
          customer_name?: string
          details?: Json
          discount_code?: string | null
          discount_percent?: number
          email?: string
          id?: string
          internal_notes?: string
          kind?: string
          payment_method?: string
          payment_status?: string
          phone?: string
          postal_code?: string
          slot_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "availability"
            referencedColumns: ["id"]
          },
        ]
      }
      request_messages: {
        Row: {
          attachment: string
          body: string
          created_at: string
          hidden_for_client: boolean
          id: string
          is_admin: boolean
          is_bot: boolean
          read_at: string | null
          request_id: string
          sender_id: string
        }
        Insert: {
          attachment?: string
          body?: string
          created_at?: string
          hidden_for_client?: boolean
          id?: string
          is_admin?: boolean
          is_bot?: boolean
          read_at?: string | null
          request_id: string
          sender_id: string
        }
        Update: {
          attachment?: string
          body?: string
          created_at?: string
          hidden_for_client?: boolean
          id?: string
          is_admin?: boolean
          is_bot?: boolean
          read_at?: string | null
          request_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author: string
          comment: string
          created_at: string
          id: string
          photo: string
          rating: number
        }
        Insert: {
          author: string
          comment?: string
          created_at?: string
          id?: string
          photo?: string
          rating: number
        }
        Update: {
          author?: string
          comment?: string
          created_at?: string
          id?: string
          photo?: string
          rating?: number
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
      consume_form_attempt: { Args: { _key: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_booking_slots: {
        Args: never
        Returns: {
          available: boolean
          ends_at: string
          id: string
          starts_at: string
        }[]
      }
      list_open_slots: {
        Args: never
        Returns: {
          ends_at: string
          id: string
          starts_at: string
        }[]
      }
      open_availability_range: { Args: { _slots: Json }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
