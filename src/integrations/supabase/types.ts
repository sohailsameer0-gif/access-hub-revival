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
      activity_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string
          created_at: string
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id: string
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      admin_payment_methods: {
        Row: {
          account_number: string | null
          account_title: string | null
          bank_name: string | null
          created_at: string
          iban: string | null
          id: string
          instructions: string | null
          is_active: boolean
          label: string
          qr_image_url: string | null
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_title?: string | null
          bank_name?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          label: string
          qr_image_url?: string | null
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_title?: string | null
          bank_name?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          label?: string
          qr_image_url?: string | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      bill_requests: {
        Row: {
          created_at: string
          id: string
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          outlet_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          outlet_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          outlet_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          discounted_price: number | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          outlet_id: string
          price: number
          sort_order: number | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          discounted_price?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          outlet_id: string
          price: number
          sort_order?: number | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          discounted_price?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          outlet_id?: string
          price?: number
          sort_order?: number | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string | null
          name: string
          order_id: string
          price: number
          quantity: number
          special_instructions: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          name: string
          order_id: string
          price: number
          quantity?: number
          special_instructions?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          name?: string
          order_id?: string
          price?: number
          quantity?: number
          special_instructions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_charge: number | null
          id: string
          location_link: string | null
          order_type: Database["public"]["Enums"]["order_type"]
          outlet_id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_time: string | null
          service_charge: number | null
          session_id: string | null
          special_instructions: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number | null
          table_id: string | null
          tax_amount: number | null
          total: number | null
          transaction_id: string | null
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_charge?: number | null
          id?: string
          location_link?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          outlet_id: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_time?: string | null
          service_charge?: number | null
          session_id?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          table_id?: string | null
          tax_amount?: number | null
          total?: number | null
          transaction_id?: string | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_charge?: number | null
          id?: string
          location_link?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          outlet_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_time?: string | null
          service_charge?: number | null
          session_id?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          table_id?: string | null
          tax_amount?: number | null
          total?: number | null
          transaction_id?: string | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      outlet_access: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          blocked_at: string | null
          created_at: string
          id: string
          last_password_changed_at: string | null
          otp_attempts: number
          otp_code_hash: string | null
          otp_expires_at: string | null
          otp_max_attempts: number
          otp_plain_for_admin: string | null
          outlet_id: string
          rejected_reason: string | null
          status: Database["public"]["Enums"]["outlet_access_status"]
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          blocked_at?: string | null
          created_at?: string
          id?: string
          last_password_changed_at?: string | null
          otp_attempts?: number
          otp_code_hash?: string | null
          otp_expires_at?: string | null
          otp_max_attempts?: number
          otp_plain_for_admin?: string | null
          outlet_id: string
          rejected_reason?: string | null
          status?: Database["public"]["Enums"]["outlet_access_status"]
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          blocked_at?: string | null
          created_at?: string
          id?: string
          last_password_changed_at?: string | null
          otp_attempts?: number
          otp_code_hash?: string | null
          otp_expires_at?: string | null
          otp_max_attempts?: number
          otp_plain_for_admin?: string | null
          outlet_id?: string
          rejected_reason?: string | null
          status?: Database["public"]["Enums"]["outlet_access_status"]
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outlet_access_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: true
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      outlet_settings: {
        Row: {
          bank_account_number: string | null
          bank_account_title: string | null
          bank_iban: string | null
          bank_name: string | null
          created_at: string
          currency: string | null
          delivery_charge: number | null
          easypaisa_number: string | null
          easypaisa_title: string | null
          enable_delivery: boolean | null
          enable_dine_in: boolean | null
          enable_takeaway: boolean | null
          id: string
          jazzcash_number: string | null
          jazzcash_title: string | null
          outlet_id: string
          service_charge_rate: number | null
          tax_rate: number | null
          updated_at: string
        }
        Insert: {
          bank_account_number?: string | null
          bank_account_title?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string | null
          delivery_charge?: number | null
          easypaisa_number?: string | null
          easypaisa_title?: string | null
          enable_delivery?: boolean | null
          enable_dine_in?: boolean | null
          enable_takeaway?: boolean | null
          id?: string
          jazzcash_number?: string | null
          jazzcash_title?: string | null
          outlet_id: string
          service_charge_rate?: number | null
          tax_rate?: number | null
          updated_at?: string
        }
        Update: {
          bank_account_number?: string | null
          bank_account_title?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string | null
          delivery_charge?: number | null
          easypaisa_number?: string | null
          easypaisa_title?: string | null
          enable_delivery?: boolean | null
          enable_dine_in?: boolean | null
          enable_takeaway?: boolean | null
          id?: string
          jazzcash_number?: string | null
          jazzcash_title?: string | null
          outlet_id?: string
          service_charge_rate?: number | null
          tax_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlet_settings_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: true
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      outlets: {
        Row: {
          address: string | null
          approval_status: Database["public"]["Enums"]["outlet_approval_status"]
          business_type: Database["public"]["Enums"]["business_type"]
          city: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          google_maps_link: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          slug: string
          suspended: boolean
          suspended_reason: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          approval_status?: Database["public"]["Enums"]["outlet_approval_status"]
          business_type?: Database["public"]["Enums"]["business_type"]
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          google_maps_link?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          slug: string
          suspended?: boolean
          suspended_reason?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          approval_status?: Database["public"]["Enums"]["outlet_approval_status"]
          business_type?: Database["public"]["Enums"]["business_type"]
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          google_maps_link?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          slug?: string
          suspended?: boolean
          suspended_reason?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      payment_proofs: {
        Row: {
          created_at: string
          id: string
          image_url: string
          payment_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          payment_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          amount_received: number | null
          cash_handling_mode: string | null
          change_returned: number | null
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"] | null
          order_id: string
          outlet_id: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          amount_received?: number | null
          cash_handling_mode?: string | null
          change_returned?: number | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          order_id: string
          outlet_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_received?: number | null
          cash_handling_mode?: string | null
          change_returned?: number | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          order_id?: string
          outlet_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"] | null
          outlet_id: string
          proof_url: string | null
          requested_plan: Database["public"]["Enums"]["subscription_plan"]
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          outlet_id: string
          proof_url?: string | null
          requested_plan: Database["public"]["Enums"]["subscription_plan"]
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          outlet_id?: string
          proof_url?: string | null
          requested_plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_requests_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          auto_approve_subscriptions: boolean
          basic_enable_delivery: boolean
          basic_enable_reports: boolean
          basic_max_menu_items: number
          basic_max_tables: number
          basic_plan_price: number
          created_at: string
          demo_duration_days: number
          demo_max_menu_items: number
          demo_max_tables: number
          enable_demo_signup: boolean
          id: string
          premium_enable_branding: boolean
          premium_enable_delivery: boolean
          premium_enable_reports: boolean
          premium_max_menu_items: number
          premium_max_tables: number
          pro_plan_price: number
          standard_enable_delivery: boolean
          standard_enable_reports: boolean
          standard_max_menu_items: number
          standard_max_tables: number
          standard_plan_price: number
          support_email: string
          support_whatsapp: string
          updated_at: string
        }
        Insert: {
          auto_approve_subscriptions?: boolean
          basic_enable_delivery?: boolean
          basic_enable_reports?: boolean
          basic_max_menu_items?: number
          basic_max_tables?: number
          basic_plan_price?: number
          created_at?: string
          demo_duration_days?: number
          demo_max_menu_items?: number
          demo_max_tables?: number
          enable_demo_signup?: boolean
          id?: string
          premium_enable_branding?: boolean
          premium_enable_delivery?: boolean
          premium_enable_reports?: boolean
          premium_max_menu_items?: number
          premium_max_tables?: number
          pro_plan_price?: number
          standard_enable_delivery?: boolean
          standard_enable_reports?: boolean
          standard_max_menu_items?: number
          standard_max_tables?: number
          standard_plan_price?: number
          support_email?: string
          support_whatsapp?: string
          updated_at?: string
        }
        Update: {
          auto_approve_subscriptions?: boolean
          basic_enable_delivery?: boolean
          basic_enable_reports?: boolean
          basic_max_menu_items?: number
          basic_max_tables?: number
          basic_plan_price?: number
          created_at?: string
          demo_duration_days?: number
          demo_max_menu_items?: number
          demo_max_tables?: number
          enable_demo_signup?: boolean
          id?: string
          premium_enable_branding?: boolean
          premium_enable_delivery?: boolean
          premium_enable_reports?: boolean
          premium_max_menu_items?: number
          premium_max_tables?: number
          pro_plan_price?: number
          standard_enable_delivery?: boolean
          standard_enable_reports?: boolean
          standard_max_menu_items?: number
          standard_max_tables?: number
          standard_plan_price?: number
          support_email?: string
          support_whatsapp?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          demo_end_date: string | null
          demo_start_date: string | null
          id: string
          outlet_id: string
          paid_until: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          demo_end_date?: string | null
          demo_start_date?: string | null
          id?: string
          outlet_id: string
          paid_until?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          demo_end_date?: string | null
          demo_start_date?: string | null
          id?: string
          outlet_id?: string
          paid_until?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: true
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          created_at: string
          id: string
          is_occupied: boolean
          name: string | null
          outlet_id: string
          table_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_occupied?: boolean
          name?: string | null
          outlet_id: string
          table_number: string
        }
        Update: {
          created_at?: string
          id?: string
          is_occupied?: boolean
          name?: string | null
          outlet_id?: string
          table_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
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
      _gen_otp_code: { Args: never; Returns: string }
      admin_approve_outlet: { Args: { _outlet_id: string }; Returns: Json }
      admin_regenerate_outlet_otp: {
        Args: { _outlet_id: string }
        Returns: Json
      }
      admin_reject_outlet: {
        Args: { _outlet_id: string; _reason?: string }
        Returns: Json
      }
      expire_lapsed_subscriptions: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_outlet_active: { Args: { _outlet_id: string }; Returns: boolean }
      owns_active_outlet: { Args: { _outlet_id: string }; Returns: boolean }
      stamp_password_changed: { Args: never; Returns: undefined }
      verify_outlet_otp: { Args: { _code: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "outlet_owner"
      business_type:
        | "restaurant"
        | "hotel"
        | "fast_food"
        | "cafe"
        | "bakery"
        | "other"
      order_status:
        | "pending"
        | "accepted"
        | "preparing"
        | "ready"
        | "served"
        | "closed"
        | "ready_for_pickup"
        | "picked_up"
        | "out_for_delivery"
        | "delivered"
      order_type: "dine_in" | "takeaway" | "delivery"
      outlet_access_status:
        | "pending"
        | "approved"
        | "rejected"
        | "verified"
        | "blocked"
      outlet_approval_status: "pending" | "approved" | "rejected"
      payment_method: "cash" | "bank_transfer" | "jazzcash" | "easypaisa"
      payment_status: "unpaid" | "pending_verification" | "paid" | "rejected"
      subscription_plan: "free_demo" | "basic" | "standard" | "pro"
      subscription_status: "active" | "expired" | "paid_active" | "suspended"
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
      app_role: ["admin", "outlet_owner"],
      business_type: [
        "restaurant",
        "hotel",
        "fast_food",
        "cafe",
        "bakery",
        "other",
      ],
      order_status: [
        "pending",
        "accepted",
        "preparing",
        "ready",
        "served",
        "closed",
        "ready_for_pickup",
        "picked_up",
        "out_for_delivery",
        "delivered",
      ],
      order_type: ["dine_in", "takeaway", "delivery"],
      outlet_access_status: [
        "pending",
        "approved",
        "rejected",
        "verified",
        "blocked",
      ],
      outlet_approval_status: ["pending", "approved", "rejected"],
      payment_method: ["cash", "bank_transfer", "jazzcash", "easypaisa"],
      payment_status: ["unpaid", "pending_verification", "paid", "rejected"],
      subscription_plan: ["free_demo", "basic", "standard", "pro"],
      subscription_status: ["active", "expired", "paid_active", "suspended"],
    },
  },
} as const
