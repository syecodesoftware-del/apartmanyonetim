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
      site_deletion_requests: {
        Row: {
          id: string
          site_id: string
          requested_by: string | null
          reason: string | null
          status: string
          decided_by: string | null
          decided_at: string | null
          decision_note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          site_id: string
          requested_by?: string | null
          reason?: string | null
          status?: string
          decided_by?: string | null
          decided_at?: string | null
          decision_note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          requested_by?: string | null
          reason?: string | null
          status?: string
          decided_by?: string | null
          decided_at?: string | null
          decision_note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      site_memberships: {
        Row: {
          id: string
          user_id: string
          site_id: string
          unit_id: string | null
          role: string
          relationship: string | null
          approval_status: string
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          site_id: string
          unit_id?: string | null
          role?: string
          relationship?: string | null
          approval_status?: string
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          site_id?: string
          unit_id?: string | null
          role?: string
          relationship?: string | null
          approval_status?: string
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_pinned: boolean | null
          priority: string | null
          site_id: string
          title: string
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          priority?: string | null
          site_id: string
          title: string
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          priority?: string | null
          site_id?: string
          title?: string
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          area_name: string
          created_at: string | null
          end_datetime: string
          id: string
          note: string | null
          site_id: string
          start_datetime: string
          status: string | null
          user_id: string
        }
        Insert: {
          area_name: string
          created_at?: string | null
          end_datetime: string
          id?: string
          note?: string | null
          site_id: string
          start_datetime: string
          status?: string | null
          user_id: string
        }
        Update: {
          area_name?: string
          created_at?: string | null
          end_datetime?: string
          id?: string
          note?: string | null
          site_id?: string
          start_datetime?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_anonymous: boolean
          photos: Json | null
          priority: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          site_id: string
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_anonymous?: boolean
          photos?: Json | null
          priority?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          site_id: string
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_anonymous?: boolean
          photos?: Json | null
          priority?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          site_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dues_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          paid_at: string | null
          payment_method: string | null
          paytr_merchant_oid: string | null
          paytr_reference: string | null
          period_month: number
          period_year: number
          plan_id: string | null
          receipt_url: string | null
          site_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          paytr_merchant_oid?: string | null
          paytr_reference?: string | null
          period_month: number
          period_year: number
          plan_id?: string | null
          receipt_url?: string | null
          site_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          paytr_merchant_oid?: string | null
          paytr_reference?: string | null
          period_month?: number
          period_year?: number
          plan_id?: string | null
          receipt_url?: string | null
          site_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dues_payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "dues_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dues_payments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dues_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dues_plans: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          due_day: number | null
          id: string
          is_active: boolean | null
          name: string
          site_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_day?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          site_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_day?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          site_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dues_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dues_plans_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_transfers: {
        Row: {
          created_at: string | null
          from_manager_id: string
          id: string
          resolved_at: string | null
          site_id: string
          status: string
          to_resident_id: string
        }
        Insert: {
          created_at?: string | null
          from_manager_id: string
          id?: string
          resolved_at?: string | null
          site_id: string
          status?: string
          to_resident_id: string
        }
        Update: {
          created_at?: string | null
          from_manager_id?: string
          id?: string
          resolved_at?: string | null
          site_id?: string
          status?: string
          to_resident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_transfers_from_manager_id_fkey"
            columns: ["from_manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_transfers_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_transfers_to_resident_id_fkey"
            columns: ["to_resident_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_billing_settings: {
        Row: {
          billing_period: string
          currency: string
          default_trial_days: number
          default_unit_price: number
          id: boolean
          updated_at: string | null
        }
        Insert: {
          billing_period?: string
          currency?: string
          default_trial_days?: number
          default_unit_price?: number
          id?: boolean
          updated_at?: string | null
        }
        Update: {
          billing_period?: string
          currency?: string
          default_trial_days?: number
          default_unit_price?: number
          id?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          id: string
          option_index: number
          poll_id: string
          user_id: string
          voted_at: string | null
        }
        Insert: {
          id?: string
          option_index: number
          poll_id: string
          user_id: string
          voted_at?: string | null
        }
        Update: {
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          created_at: string | null
          created_by: string | null
          ends_at: string
          id: string
          is_active: boolean | null
          options: Json
          question: string
          site_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          ends_at: string
          id?: string
          is_active?: boolean | null
          options: Json
          question: string
          site_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean | null
          options?: Json
          question?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_payments: {
        Row: {
          amount: number
          code: string
          created_at: string | null
          expires_at: string
          id: string
          is_used: boolean | null
          site_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          code?: string
          created_at?: string | null
          expires_at: string
          id?: string
          is_used?: boolean | null
          site_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          is_used?: boolean | null
          site_id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_payments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      site_invitations: {
        Row: {
          apartment_number: string | null
          block: string | null
          claimed_at: string | null
          claimed_by: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string
          site_id: string
          status: string
          tc_kimlik: string | null
          token: string | null
          token_expires_at: string | null
        }
        Insert: {
          apartment_number?: string | null
          block?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          site_id: string
          status?: string
          tc_kimlik?: string | null
          token?: string | null
          token_expires_at?: string | null
        }
        Update: {
          apartment_number?: string | null
          block?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          site_id?: string
          status?: string
          tc_kimlik?: string | null
          token?: string | null
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_invitations_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_invitations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string | null
          apartment_count: number | null
          billing_unit_price: number | null
          building_number: string | null
          city: string | null
          code_generated_at: string | null
          created_at: string | null
          district: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          independent_unit_count: number
          is_individual: boolean
          logo_url: string | null
          name: string
          neighborhood: string | null
          settings: Json | null
          site_code: string
          street: string | null
          subscription_end_date: string | null
          subscription_plan: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          apartment_count?: number | null
          billing_unit_price?: number | null
          building_number?: string | null
          city?: string | null
          code_generated_at?: string | null
          created_at?: string | null
          district?: string | null
          id?: string
          independent_unit_count?: number
          logo_url?: string | null
          name: string
          neighborhood?: string | null
          settings?: Json | null
          site_code: string
          street?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          apartment_count?: number | null
          billing_unit_price?: number | null
          building_number?: string | null
          city?: string | null
          code_generated_at?: string | null
          created_at?: string | null
          district?: string | null
          id?: string
          independent_unit_count?: number
          logo_url?: string | null
          name?: string
          neighborhood?: string | null
          settings?: Json | null
          site_code?: string
          street?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          paid_at: string | null
          paytr_reference: string | null
          period_end: string | null
          period_start: string | null
          plan: string
          site_id: string
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          paytr_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          plan: string
          site_id: string
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          paytr_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          plan?: string
          site_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          id: string
          receipt_url: string | null
          site_id: string
          type: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          receipt_url?: string | null
          site_id: string
          type: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          receipt_url?: string | null
          site_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          created_at: string | null
          device_model: string | null
          fcm_token: string
          id: string
          platform: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_model?: string | null
          fcm_token: string
          id?: string
          platform?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_model?: string | null
          fcm_token?: string
          id?: string
          platform?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      late_fee_policies: {
        Row: { grace_days: number; gunluk_bolme: string; hesaplama_modu: string; oran_aylik: number; site_id: string; updated_at: string | null; yuvarlama: string }
        Insert: { grace_days?: number; gunluk_bolme?: string; hesaplama_modu?: string; oran_aylik?: number; site_id: string; updated_at?: string | null; yuvarlama?: string }
        Update: { grace_days?: number; gunluk_bolme?: string; hesaplama_modu?: string; oran_aylik?: number; site_id?: string; updated_at?: string | null; yuvarlama?: string }
        Relationships: [
          {
            foreignKeyName: "late_fee_policies_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      accruals: {
        Row: { amount: number; charge_type_id: string | null; created_at: string | null; debtor_user_id: string | null; description: string | null; due_date: string | null; id: string; period_month: number | null; period_year: number | null; principal_remaining: number; site_id: string; status: string; unit_id: string | null }
        Insert: { amount: number; charge_type_id?: string | null; created_at?: string | null; debtor_user_id?: string | null; description?: string | null; due_date?: string | null; id?: string; period_month?: number | null; period_year?: number | null; principal_remaining: number; site_id: string; status?: string; unit_id?: string | null }
        Update: { amount?: number; charge_type_id?: string | null; created_at?: string | null; debtor_user_id?: string | null; description?: string | null; due_date?: string | null; id?: string; period_month?: number | null; period_year?: number | null; principal_remaining?: number; site_id?: string; status?: string; unit_id?: string | null }
        Relationships: []
      }
      charge_types: {
        Row: { ad: string; borc_hedefi: string; created_at: string | null; gecikme_uygula: boolean; id: string; is_active: boolean; is_icra: boolean; site_id: string }
        Insert: { ad: string; borc_hedefi?: string; created_at?: string | null; gecikme_uygula?: boolean; id?: string; is_active?: boolean; is_icra?: boolean; site_id: string }
        Update: { ad?: string; borc_hedefi?: string; created_at?: string | null; gecikme_uygula?: boolean; id?: string; is_active?: boolean; is_icra?: boolean; site_id?: string }
        Relationships: [
          {
            foreignKeyName: "charge_types_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_accounts: {
        Row: { ad: string; created_at: string | null; iban: string | null; id: string; is_active: boolean; opening_balance: number; site_id: string; tur: string }
        Insert: { ad: string; created_at?: string | null; iban?: string | null; id?: string; is_active?: boolean; opening_balance?: number; site_id: string; tur?: string }
        Update: { ad?: string; created_at?: string | null; iban?: string | null; id?: string; is_active?: boolean; opening_balance?: number; site_id?: string; tur?: string }
        Relationships: [
          {
            foreignKeyName: "cash_accounts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_expenses: {
        Row: { amount: number; cash_account_id: string | null; category: string | null; created_at: string | null; created_by: string | null; description: string | null; id: string; receipt_url: string | null; site_id: string; spent_at: string }
        Insert: { amount: number; cash_account_id?: string | null; category?: string | null; created_at?: string | null; created_by?: string | null; description?: string | null; id?: string; receipt_url?: string | null; site_id: string; spent_at?: string }
        Update: { amount?: number; cash_account_id?: string | null; category?: string | null; created_at?: string | null; created_by?: string | null; description?: string | null; id?: string; receipt_url?: string | null; site_id?: string; spent_at?: string }
        Relationships: [
          {
            foreignKeyName: "cash_expenses_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_expenses_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: { amount: number; cash_account_id: string | null; created_at: string | null; id: string; method: string; paid_at: string | null; payer_user_id: string | null; receipt_url: string | null; site_id: string; unit_id: string | null }
        Insert: { amount: number; cash_account_id?: string | null; created_at?: string | null; id?: string; method?: string; paid_at?: string | null; payer_user_id?: string | null; receipt_url?: string | null; site_id: string; unit_id?: string | null }
        Update: { amount?: number; cash_account_id?: string | null; created_at?: string | null; id?: string; method?: string; paid_at?: string | null; payer_user_id?: string | null; receipt_url?: string | null; site_id?: string; unit_id?: string | null }
        Relationships: [
          {
            foreignKeyName: "collections_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: { amount: number; balance_after: number | null; bank_ref: string | null; cash_account_id: string; counterparty: string | null; created_at: string | null; created_by: string | null; description: string | null; direction: string; id: string; match_status: string; matched_collection_id: string | null; matched_expense_id: string | null; site_id: string; txn_date: string }
        Insert: { amount: number; balance_after?: number | null; bank_ref?: string | null; cash_account_id: string; counterparty?: string | null; created_at?: string | null; created_by?: string | null; description?: string | null; direction: string; id?: string; match_status?: string; matched_collection_id?: string | null; matched_expense_id?: string | null; site_id: string; txn_date: string }
        Update: { amount?: number; balance_after?: number | null; bank_ref?: string | null; cash_account_id?: string; counterparty?: string | null; created_at?: string | null; created_by?: string | null; description?: string | null; direction?: string; id?: string; match_status?: string; matched_collection_id?: string | null; matched_expense_id?: string | null; site_id?: string; txn_date?: string }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_collection_id_fkey"
            columns: ["matched_collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          created_at: string | null
          id: string
          manager_user_id: string | null
          name: string
          site_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          manager_user_id?: string | null
          name: string
          site_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          manager_user_id?: string | null
          name?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancies: {
        Row: {
          id: string
          site_id: string
          unit_id: string
          user_id: string | null
          relationship: string
          full_name: string
          phone: string | null
          tc_kimlik: string | null
          start_date: string
          end_date: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          site_id: string
          unit_id: string
          user_id?: string | null
          relationship: string
          full_name: string
          phone?: string | null
          tc_kimlik?: string | null
          start_date?: string
          end_date?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          site_id?: string
          unit_id?: string
          user_id?: string | null
          relationship?: string
          full_name?: string
          phone?: string | null
          tc_kimlik?: string | null
          start_date?: string
          end_date?: string | null
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenancies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          ada_id: string | null
          apartment_number: string
          arsa_payi: number | null
          block: string | null
          created_at: string | null
          floor: number | null
          id: string
          m2: number | null
          site_id: string
        }
        Insert: {
          ada_id?: string | null
          apartment_number: string
          arsa_payi?: number | null
          block?: string | null
          created_at?: string | null
          floor?: number | null
          id?: string
          m2?: number | null
          site_id: string
        }
        Update: {
          ada_id?: string | null
          apartment_number?: string
          arsa_payi?: number | null
          block?: string | null
          created_at?: string | null
          floor?: number | null
          id?: string
          m2?: number | null
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_ada_id_fkey"
            columns: ["ada_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          apartment_number: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          block: string | null
          created_at: string | null
          email: string
          floor: number | null
          full_name: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          notification_preferences: Json | null
          phone: string | null
          rejected_reason: string | null
          role: string | null
          site_id: string | null
          tc_kimlik: string | null
          tc_validation_status: string
          unit_id: string | null
        }
        Insert: {
          apartment_number?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          block?: string | null
          created_at?: string | null
          email: string
          floor?: number | null
          full_name: string
          id: string
          is_active?: boolean | null
          last_login_at?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          rejected_reason?: string | null
          role?: string | null
          site_id?: string | null
          tc_kimlik?: string | null
          tc_validation_status?: string
          unit_id?: string | null
        }
        Update: {
          apartment_number?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          block?: string | null
          created_at?: string | null
          email?: string
          floor?: number | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          rejected_reason?: string | null
          role?: string | null
          site_id?: string | null
          tc_kimlik?: string | null
          tc_validation_status?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      complaints_manager_view: {
        Row: {
          id: string | null
          site_id: string | null
          user_id: string | null
          category: string | null
          title: string | null
          description: string | null
          status: string | null
          priority: string | null
          photos: Json | null
          resolved_by: string | null
          resolved_at: string | null
          resolution_note: string | null
          is_anonymous: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      current_occupants: {
        Row: {
          tenancy_id: string | null
          site_id: string | null
          unit_id: string | null
          block: string | null
          apartment_number: string | null
          floor: number | null
          user_id: string | null
          relationship: string | null
          full_name: string | null
          phone: string | null
          tc_kimlik: string | null
          email: string | null
          account_role: string | null
          approval_status: string | null
          has_account: boolean | null
          start_date: string | null
          created_at: string | null
          toplam_borc: number | null
          kalan_anapara: number | null
          kalan_gecikme: number | null
        }
        Relationships: []
      }
      unit_balances: {
        Row: {
          unit_id: string | null
          site_id: string | null
          block: string | null
          apartment_number: string | null
          kalan_anapara: number | null
          kalan_gecikme: number | null
          toplam_borc: number | null
        }
        Relationships: []
      }
      cash_account_balances: {
        Row: {
          cash_account_id: string | null
          site_id: string | null
          ad: string | null
          tur: string | null
          is_active: boolean | null
          balance: number | null
        }
        Relationships: []
      }
      cash_movements: {
        Row: {
          id: string | null
          site_id: string | null
          cash_account_id: string | null
          yon: string | null
          amount: number | null
          hareket_tarihi: string | null
          tur: string | null
          detay: string | null
          sirala: string | null
        }
        Relationships: []
      }
      bank_reconciliation: {
        Row: {
          cash_account_id: string | null
          site_id: string | null
          ad: string | null
          iban: string | null
          defter_bakiye: number | null
          banka_net: number | null
          eslesmeyen_sayi: number | null
          eslesmeyen_tutar: number | null
          toplam_hareket: number | null
        }
        Relationships: []
      }
      unit_ledger: {
        Row: {
          id: string | null
          site_id: string | null
          unit_id: string | null
          tarih: string | null
          tur: string | null
          aciklama: string | null
          borc: number | null
          odeme: number | null
          sirala: string | null
          durum: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auth_user_approval_status: { Args: never; Returns: string }
      auth_user_role: { Args: never; Returns: string }
      auth_user_site_id: { Args: never; Returns: string }
      switch_active_site: { Args: { p_site_id: string }; Returns: string }
      request_site_membership: {
        Args: { p_site_code: string }
        Returns: { site_id: string; site_name: string; status: string }
      }
      approve_site_membership: {
        Args: { p_membership_id: string; p_approve: boolean; p_unit_id?: string }
        Returns: undefined
      }
      calculate_late_fees: {
        Args: { p_site_id: string; p_as_of_date: string }
        Returns: number
      }
      generate_accruals: {
        Args: {
          p_site_id: string
          p_charge_type_id: string
          p_period_month: number
          p_period_year: number
          p_due_date: string
          p_amount: number
          p_distribution: string
        }
        Returns: number
      }
      generate_site_code: { Args: never; Returns: string }
      record_collection: {
        Args: {
          p_site_id: string
          p_unit_id: string
          p_amount: number
          p_method?: string
          p_paid_at?: string
          p_cash_account_id?: string
        }
        Returns: number
      }
      get_debtors: {
        Args: never
        Returns: {
          amount: number
          full_name: string
          period_month: number
          period_year: number
          phone: string
          site_id: string
          user_id: string
        }[]
      }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          apartment_number: string
          block: string
          full_name: string
          role: string
          site_id: string
          site_name: string
        }[]
      }
      validate_site_code: {
        Args: { p_code: string }
        Returns: {
          apartment_count: number
          city: string
          district: string
          id: string
          name: string
        }[]
      }
      tc_kimlik_exists: { Args: { p_tc: string }; Returns: boolean }
      validate_tc_kimlik: { Args: { p_tc: string }; Returns: boolean }
      set_unit_occupant: {
        Args: {
          p_unit_id: string
          p_relationship: string
          p_full_name: string
          p_user_id?: string | null
          p_phone?: string | null
          p_tc_kimlik?: string | null
          p_start_date?: string
        }
        Returns: string
      }
      transfer_unit_ownership: {
        Args: {
          p_unit_id: string
          p_new_full_name: string
          p_new_user_id?: string | null
          p_new_phone?: string | null
          p_new_tc?: string | null
          p_move_owner_debt?: boolean
          p_effective_date?: string
        }
        Returns: string
      }
      transfer_tenant_debt_to_owner: {
        Args: { p_unit_id: string }
        Returns: { moved_count: number; moved_amount: number }[]
      }
      end_tenancy: {
        Args: { p_tenancy_id: string; p_end_date?: string }
        Returns: undefined
      }
      waive_accrual: {
        Args: { p_accrual_id: string; p_reason?: string | null }
        Returns: undefined
      }
      unwaive_accrual: {
        Args: { p_accrual_id: string }
        Returns: undefined
      }
      is_valid_tc: { Args: { p_tc: string }; Returns: boolean }
      bulk_import_units_residents: { Args: { p_rows: Json }; Returns: Json }
      approve_bank_txn_as_collection: { Args: { p_txn_id: string; p_unit_id: string }; Returns: Json }
      request_site_deletion: { Args: { p_reason: string }; Returns: Json }
      cancel_site_deletion_request: { Args: { p_request_id: string }; Returns: Json }
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
  public: {
    Enums: {},
  },
} as const
