export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      platform_settings: {
        Row: {
          id: string
          created_at: string | null
          max_pos_usage_free: number
          max_pos_usage_premium: number
        }
        Insert: {
          id?: string
          created_at?: string | null
          max_pos_usage_free: number
          max_pos_usage_premium: number
        }
        Update: {
          id?: string
          created_at?: string | null
          max_pos_usage_free?: number
          max_pos_usage_premium?: number
        }
        Relationships: []
      }
      pos_usage_tracking: {
        Row: {
          id: string
          created_at: string | null
          business_id: string
          usage_date: string
          usage_count: number
        }
        Insert: {
          id?: string
          created_at?: string | null
          business_id: string
          usage_date: string
          usage_count: number
        }
        Update: {
          id?: string
          created_at?: string | null
          business_id?: string
          usage_date?: string
          usage_count?: number
        }
        Relationships: []
      }
      businesses: {
        Row: {
          address: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          premium_days_left: number | null
          premium_end: string | null
          premium_start: string | null
          qris_url: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          premium_days_left?: number | null
          premium_end?: string | null
          premium_start?: string | null
          qris_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          premium_days_left?: number | null
          premium_end?: string | null
          premium_start?: string | null
          qris_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          business_id: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          business_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_settings: {
        Row: {
          feature_name: string
          id: number
          is_free: boolean
          is_premium: boolean
          label: string
        }
        Insert: {
          feature_name: string
          id?: number
          is_free?: boolean
          is_premium?: boolean
          label: string
        }
        Update: {
          feature_name?: string
          id?: number
          is_free?: boolean
          is_premium?: boolean
          label?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          order_id: string
          price: number
          quantity: number
          service_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id: string
          price: number
          quantity: number
          service_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          price?: number
          quantity?: number
          service_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          status: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          status: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          status?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          customer_id: string
          estimated_completion: string | null
          id: string
          notes: string | null
          status: string
          total_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          estimated_completion?: string | null
          id?: string
          notes?: string | null
          status?: string
          total_price?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          estimated_completion?: string | null
          id?: string
          notes?: string | null
          status?: string
          total_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          price: number
          stock_quantity: number
          unit: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          price: number
          stock_quantity?: number
          unit: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          price?: number
          stock_quantity?: number
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rack_slots: {
        Row: {
          assigned_at: string | null
          due_date: string | null
          id: string
          occupied: boolean
          order_id: string | null
          position: string
          rack_id: string
        }
        Insert: {
          assigned_at?: string | null
          due_date?: string | null
          id?: string
          occupied?: boolean
          order_id?: string | null
          position: string
          rack_id: string
        }
        Update: {
          assigned_at?: string | null
          due_date?: string | null
          id?: string
          occupied?: boolean
          order_id?: string | null
          position?: string
          rack_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rack_slots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rack_slots_rack_id_fkey"
            columns: ["rack_id"]
            isOneToOne: false
            referencedRelation: "racks"
            referencedColumns: ["id"]
          },
        ]
      }
      racks: {
        Row: {
          available_slots: number
          description: string
          id: string
          name: string
          total_slots: number
        }
        Insert: {
          available_slots?: number
          description: string
          id?: string
          name: string
          total_slots?: number
        }
        Update: {
          available_slots?: number
          description?: string
          id?: string
          name?: string
          total_slots?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          id: string
          payment_method: string
          related_order_id: string | null
          related_product_id: string | null
          status: string
          type: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date?: string
          description: string
          id?: string
          payment_method: string
          related_order_id?: string | null
          related_product_id?: string | null
          status?: string
          type: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          payment_method?: string
          related_order_id?: string | null
          related_product_id?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_related_product_id_fkey"
            columns: ["related_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          category: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          category: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          category?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      },
      notifications: {
        Row: {
          id: string;
          business_id: string;
          order_id: string | null;
          message: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          order_id?: string | null;
          message: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          order_id?: string | null;
          message?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      },
      notification_templates: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          template: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          template: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          template?: string;
          created_at?: string;
        };
        Relationships: [];
      },
      premium_plans: {
        Row: {
          id: string;
          name: string;
          price: number;
          duration_month: number;
          description: string;
          features: string[];
          status: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          duration_month: number;
          description: string;
          features: string[];
          status: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          duration_month?: number;
          description?: string;
          features?: string[];
          status?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      },
      owner_payment_methods: {
        Row: {
          id: string;
          type: string; // 'bank' atau 'qris'
          bank_name: string | null;
          account_number: string | null;
          account_name: string | null;
          qris_image_path: string | null; // path file di Supabase Storage
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          bank_name?: string | null;
          account_number?: string | null;
          account_name?: string | null;
          qris_image_path?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          bank_name?: string | null;
          account_number?: string | null;
          account_name?: string | null;
          qris_image_path?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      },
      discussion_threads: {
        Row: {
          id: string
          title: string
          content: string
          user_id: string
          business_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          user_id: string
          business_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          user_id?: string
          business_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_threads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      },
      discussion_replies: {
        Row: {
          id: string
          content: string
          thread_id: string
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          content: string
          thread_id: string
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content?: string
          thread_id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "discussion_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      },
      discussion_reports: {
        Row: {
          id: string
          type: 'thread' | 'reply'
          item_id: string
          reason: string
          reporter_id: string
          reported_user_id: string
          business_id: string
          status: 'pending' | 'resolved' | 'rejected'
          action_taken?: string
          action_notes?: string
          created_at: string
          reviewed_at?: string
          reviewed_by?: string
        }
        Insert: {
          id?: string
          type: 'thread' | 'reply'
          item_id: string
          reason: string
          reporter_id: string
          reported_user_id: string
          business_id: string
          status?: 'pending' | 'resolved' | 'rejected'
          action_taken?: string
          action_notes?: string
          created_at?: string
          reviewed_at?: string
          reviewed_by?: string
        }
        Update: {
          id?: string
          type?: 'thread' | 'reply'
          item_id?: string
          reason?: string
          reporter_id?: string
          reported_user_id?: string
          business_id?: string
          status?: 'pending' | 'resolved' | 'rejected'
          action_taken?: string
          action_notes?: string
          created_at?: string
          reviewed_at?: string
          reviewed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_reports_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_reports_reporter_id_fkey" 
            columns: ["reporter_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_reports_reported_user_id_fkey"
            columns: ["reported_user_id"] 
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      },
      discussion_banned_users: {
        Row: {
          id: string
          user_id: string
          business_id: string
          reason: string
          banned_until: string
          created_at: string
          banned_by: string
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          business_id: string
          reason: string
          banned_until: string
          created_at?: string
          banned_by: string
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          business_id?: string
          reason?: string
          banned_until?: string
          created_at?: string
          banned_by?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "discussion_banned_users_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_banned_users_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_banned_users_banned_by_fkey"
            columns: ["banned_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      },
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
