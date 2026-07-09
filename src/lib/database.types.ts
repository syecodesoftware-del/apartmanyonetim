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
      accruals: {
        Row: {
          amount: number
          charge_type_id: string | null
          created_at: string | null
          debtor_user_id: string | null
          description: string | null
          due_date: string
          id: string
          period_month: number | null
          period_year: number | null
          principal_remaining: number
          site_id: string
          status: string
          unit_id: string | null
          waive_reason: string | null
          waived_at: string | null
          waived_by: string | null
        }
        Insert: {
          amount: number
          charge_type_id?: string | null
          created_at?: string | null
          debtor_user_id?: string | null
          description?: string | null
          due_date: string
          id?: string
          period_month?: number | null
          period_year?: number | null
          principal_remaining: number
          site_id: string
          status?: string
          unit_id?: string | null
          waive_reason?: string | null
          waived_at?: string | null
          waived_by?: string | null
        }
        Update: {
          amount?: number
          charge_type_id?: string | null
          created_at?: string | null
          debtor_user_id?: string | null
          description?: string | null
          due_date?: string
          id?: string
          period_month?: number | null
          period_year?: number | null
          principal_remaining?: number
          site_id?: string
          status?: string
          unit_id?: string | null
          waive_reason?: string | null
          waived_at?: string | null
          waived_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accruals_charge_type_id_fkey"
            columns: ["charge_type_id"]
            isOneToOne: false
            referencedRelation: "charge_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accruals_debtor_user_id_fkey"
            columns: ["debtor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accruals_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accruals_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_balances"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "accruals_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          id: string
          site_id: string
          year: number
          name: string
          status: string
          note: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_id: string
          year: number
          name?: string
          status?: string
          note?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          year?: number
          name?: string
          status?: string
          note?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      budget_lines: {
        Row: {
          id: string
          budget_id: string
          site_id: string
          charge_type_id: string | null
          label: string
          annual_amount: number
          distribution: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          budget_id: string
          site_id: string
          charge_type_id?: string | null
          label: string
          annual_amount: number
          distribution?: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          budget_id?: string
          site_id?: string
          charge_type_id?: string | null
          label?: string
          annual_amount?: number
          distribution?: string
          note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      enforcement_cases: {
        Row: {
          id: string
          site_id: string
          unit_id: string
          debtor_user_id: string | null
          status: string
          case_no: string | null
          lawyer: string | null
          debt_at_open: number
          note: string | null
          opened_at: string
          opened_by: string | null
          closed_at: string | null
          closed_by: string | null
        }
        Insert: {
          id?: string
          site_id: string
          unit_id: string
          debtor_user_id?: string | null
          status?: string
          case_no?: string | null
          lawyer?: string | null
          debt_at_open?: number
          note?: string | null
          opened_at?: string
          opened_by?: string | null
          closed_at?: string | null
          closed_by?: string | null
        }
        Update: {
          id?: string
          site_id?: string
          unit_id?: string
          debtor_user_id?: string | null
          status?: string
          case_no?: string | null
          lawyer?: string | null
          debt_at_open?: number
          note?: string | null
          opened_at?: string
          opened_by?: string | null
          closed_at?: string | null
          closed_by?: string | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string
          id: string
          payload: Json | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      auth_rate_limits: {
        Row: {
          attempts: number
          key: string
          window_start: string
        }
        Insert: {
          attempts?: number
          key: string
          window_start?: string
        }
        Update: {
          attempts?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          bank_ref: string | null
          cash_account_id: string
          counterparty: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          direction: string
          id: string
          match_status: string
          matched_collection_id: string | null
          matched_expense_id: string | null
          site_id: string
          txn_date: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          bank_ref?: string | null
          cash_account_id: string
          counterparty?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          direction: string
          id?: string
          match_status?: string
          matched_collection_id?: string | null
          matched_expense_id?: string | null
          site_id: string
          txn_date: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          bank_ref?: string | null
          cash_account_id?: string
          counterparty?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          direction?: string
          id?: string
          match_status?: string
          matched_collection_id?: string | null
          matched_expense_id?: string | null
          site_id?: string
          txn_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliation"
            referencedColumns: ["cash_account_id"]
          },
          {
            foreignKeyName: "bank_transactions_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_account_balances"
            referencedColumns: ["cash_account_id"]
          },
          {
            foreignKeyName: "bank_transactions_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
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
            foreignKeyName: "bank_transactions_matched_expense_id_fkey"
            columns: ["matched_expense_id"]
            isOneToOne: false
            referencedRelation: "cash_expenses"
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
            foreignKeyName: "blocks_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_site_id_fkey"
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
      cash_accounts: {
        Row: {
          ad: string
          created_at: string | null
          iban: string | null
          id: string
          is_active: boolean
          opening_balance: number
          site_id: string
          tur: string
        }
        Insert: {
          ad: string
          created_at?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          opening_balance?: number
          site_id: string
          tur?: string
        }
        Update: {
          ad?: string
          created_at?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          opening_balance?: number
          site_id?: string
          tur?: string
        }
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
        Row: {
          amount: number
          cash_account_id: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          receipt_url: string | null
          site_id: string
          spent_at: string
        }
        Insert: {
          amount: number
          cash_account_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          receipt_url?: string | null
          site_id: string
          spent_at?: string
        }
        Update: {
          amount?: number
          cash_account_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          receipt_url?: string | null
          site_id?: string
          spent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_expenses_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliation"
            referencedColumns: ["cash_account_id"]
          },
          {
            foreignKeyName: "cash_expenses_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_account_balances"
            referencedColumns: ["cash_account_id"]
          },
          {
            foreignKeyName: "cash_expenses_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
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
      charge_types: {
        Row: {
          ad: string
          borc_hedefi: string
          created_at: string | null
          gecikme_uygula: boolean
          id: string
          is_active: boolean
          is_icra: boolean
          site_id: string
        }
        Insert: {
          ad: string
          borc_hedefi?: string
          created_at?: string | null
          gecikme_uygula?: boolean
          id?: string
          is_active?: boolean
          is_icra?: boolean
          site_id: string
        }
        Update: {
          ad?: string
          borc_hedefi?: string
          created_at?: string | null
          gecikme_uygula?: boolean
          id?: string
          is_active?: boolean
          is_icra?: boolean
          site_id?: string
        }
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
      collections: {
        Row: {
          amount: number
          cash_account_id: string | null
          created_at: string | null
          dues_payment_id: string | null
          id: string
          method: string
          paid_at: string | null
          payer_user_id: string | null
          receipt_url: string | null
          site_id: string
          unit_id: string | null
        }
        Insert: {
          amount: number
          cash_account_id?: string | null
          created_at?: string | null
          dues_payment_id?: string | null
          id?: string
          method?: string
          paid_at?: string | null
          payer_user_id?: string | null
          receipt_url?: string | null
          site_id: string
          unit_id?: string | null
        }
        Update: {
          amount?: number
          cash_account_id?: string | null
          created_at?: string | null
          dues_payment_id?: string | null
          id?: string
          method?: string
          paid_at?: string | null
          payer_user_id?: string | null
          receipt_url?: string | null
          site_id?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_cash_account_fk"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliation"
            referencedColumns: ["cash_account_id"]
          },
          {
            foreignKeyName: "collections_cash_account_fk"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_account_balances"
            referencedColumns: ["cash_account_id"]
          },
          {
            foreignKeyName: "collections_cash_account_fk"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_dues_payment_id_fkey"
            columns: ["dues_payment_id"]
            isOneToOne: false
            referencedRelation: "dues_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_payer_user_id_fkey"
            columns: ["payer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_balances"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "collections_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
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
      late_fee_policies: {
        Row: {
          grace_days: number
          gunluk_bolme: string
          hesaplama_modu: string
          oran_aylik: number
          site_id: string
          updated_at: string | null
          yuvarlama: string
        }
        Insert: {
          grace_days?: number
          gunluk_bolme?: string
          hesaplama_modu?: string
          oran_aylik?: number
          site_id: string
          updated_at?: string | null
          yuvarlama?: string
        }
        Update: {
          grace_days?: number
          gunluk_bolme?: string
          hesaplama_modu?: string
          oran_aylik?: number
          site_id?: string
          updated_at?: string | null
          yuvarlama?: string
        }
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
      late_fees: {
        Row: {
          accrual_id: string
          amount: number
          as_of_date: string
          created_at: string | null
          id: string
          site_id: string
        }
        Insert: {
          accrual_id: string
          amount: number
          as_of_date: string
          created_at?: string | null
          id?: string
          site_id: string
        }
        Update: {
          accrual_id?: string
          amount?: number
          as_of_date?: string
          created_at?: string | null
          id?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "late_fees_accrual_id_fkey"
            columns: ["accrual_id"]
            isOneToOne: false
            referencedRelation: "accruals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "late_fees_site_id_fkey"
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
      payment_allocations: {
        Row: {
          accrual_id: string | null
          amount: number
          collection_id: string
          created_at: string | null
          id: string
          late_fee_id: string | null
          site_id: string
          target_type: string
        }
        Insert: {
          accrual_id?: string | null
          amount: number
          collection_id: string
          created_at?: string | null
          id?: string
          late_fee_id?: string | null
          site_id: string
          target_type: string
        }
        Update: {
          accrual_id?: string | null
          amount?: number
          collection_id?: string
          created_at?: string | null
          id?: string
          late_fee_id?: string | null
          site_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_accrual_id_fkey"
            columns: ["accrual_id"]
            isOneToOne: false
            referencedRelation: "accruals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_late_fee_id_fkey"
            columns: ["late_fee_id"]
            isOneToOne: false
            referencedRelation: "late_fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
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
      site_deletion_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          reason: string | null
          requested_by: string | null
          site_id: string
          status: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          reason?: string | null
          requested_by?: string | null
          site_id: string
          status?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          reason?: string | null
          requested_by?: string | null
          site_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_deletion_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_deletion_requests_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
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
      site_memberships: {
        Row: {
          approval_status: string
          created_at: string | null
          id: string
          is_active: boolean | null
          relationship: string | null
          role: string
          site_id: string
          unit_id: string | null
          user_id: string
        }
        Insert: {
          approval_status?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          relationship?: string | null
          role?: string
          site_id: string
          unit_id?: string | null
          user_id: string
        }
        Update: {
          approval_status?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          relationship?: string | null
          role?: string
          site_id?: string
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_memberships_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_memberships_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_balances"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "site_memberships_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          deleted_at: string | null
          deleted_by: string | null
          district: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
          district?: string | null
          id?: string
          independent_unit_count?: number
          is_individual?: boolean
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
          deleted_at?: string | null
          deleted_by?: string | null
          district?: string | null
          id?: string
          independent_unit_count?: number
          is_individual?: boolean
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
      tenancies: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string | null
          full_name: string
          id: string
          phone: string | null
          relationship: string
          site_id: string
          start_date: string
          tc_kimlik: string | null
          unit_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          full_name: string
          id?: string
          phone?: string | null
          relationship: string
          site_id: string
          start_date?: string
          tc_kimlik?: string | null
          unit_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          relationship?: string
          site_id?: string
          start_date?: string
          tc_kimlik?: string | null
          unit_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenancies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_balances"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "tenancies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
            foreignKeyName: "units_ada_id_fkey"
            columns: ["ada_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_site_id_fkey"
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
          {
            foreignKeyName: "users_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_balances"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "users_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      bank_reconciliation: {
        Row: {
          ad: string | null
          banka_net: number | null
          cash_account_id: string | null
          defter_bakiye: number | null
          eslesmeyen_sayi: number | null
          eslesmeyen_tutar: number | null
          iban: string | null
          site_id: string | null
          toplam_hareket: number | null
        }
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
      cash_account_balances: {
        Row: {
          ad: string | null
          balance: number | null
          cash_account_id: string | null
          is_active: boolean | null
          site_id: string | null
          tur: string | null
        }
        Insert: {
          ad?: string | null
          balance?: never
          cash_account_id?: string | null
          is_active?: boolean | null
          site_id?: string | null
          tur?: string | null
        }
        Update: {
          ad?: string | null
          balance?: never
          cash_account_id?: string | null
          is_active?: boolean | null
          site_id?: string | null
          tur?: string | null
        }
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
      cash_movements: {
        Row: {
          amount: number | null
          cash_account_id: string | null
          detay: string | null
          hareket_tarihi: string | null
          id: string | null
          sirala: string | null
          site_id: string | null
          tur: string | null
          yon: string | null
        }
        Relationships: []
      }
      complaints_manager_view: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_anonymous: boolean | null
          photos: Json | null
          priority: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          site_id: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          photos?: Json | null
          priority?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          site_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: never
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          photos?: Json | null
          priority?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          site_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: never
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
        ]
      }
      current_occupants: {
        Row: {
          account_role: string | null
          apartment_number: string | null
          approval_status: string | null
          block: string | null
          created_at: string | null
          email: string | null
          floor: number | null
          full_name: string | null
          has_account: boolean | null
          kalan_anapara: number | null
          kalan_gecikme: number | null
          phone: string | null
          relationship: string | null
          site_id: string | null
          start_date: string | null
          tc_kimlik: string | null
          tenancy_id: string | null
          toplam_borc: number | null
          unit_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenancies_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_balances"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "tenancies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_balances: {
        Row: {
          apartment_number: string | null
          avans: number | null
          block: string | null
          kalan_anapara: number | null
          kalan_gecikme: number | null
          net_borc: number | null
          site_id: string | null
          toplam_borc: number | null
          unit_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_ledger: {
        Row: {
          aciklama: string | null
          borc: number | null
          durum: string | null
          id: string | null
          odeme: number | null
          sirala: string | null
          site_id: string | null
          tarih: string | null
          tur: string | null
          unit_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_unit_shared_debt: { Args: never; Returns: Json }
      create_work_order: {
        Args: {
          p_kind: string
          p_title: string
          p_description?: string
          p_priority?: string
          p_unit_id?: string
          p_due_date?: string
          p_source_complaint_id?: string
        }
        Returns: string
      }
      assign_work_order: {
        Args: {
          p_id: string
          p_assignee_user_id?: string
          p_assignee_name?: string
          p_assignee_phone?: string
        }
        Returns: undefined
      }
      update_work_order_status: {
        Args: { p_id: string; p_status: string; p_note?: string }
        Returns: undefined
      }
      set_work_order_cost: {
        Args: { p_id: string; p_cost: number; p_cost_note?: string }
        Returns: undefined
      }
      convert_complaint_to_work_order: {
        Args: { p_complaint_id: string }
        Returns: string
      }
      get_work_orders: { Args: { p_status?: string }; Returns: Json }
      get_work_order_detail: { Args: { p_id: string }; Returns: Json }
      add_site_document: {
        Args: {
          p_category: string
          p_title: string
          p_storage_path: string
          p_mime?: string
          p_size_bytes?: number
          p_entity_type?: string
          p_entity_id?: string
          p_note?: string
        }
        Returns: string
      }
      delete_site_document: { Args: { p_id: string }; Returns: string }
      get_site_documents: {
        Args: { p_category?: string; p_entity_type?: string; p_entity_id?: string }
        Returns: Json
      }
      save_asset: {
        Args: {
          p_id: string | null
          p_name: string
          p_category?: string
          p_location?: string
          p_quantity?: number
          p_serial_no?: string
          p_purchase_date?: string
          p_value?: number
          p_status?: string
          p_next_inspection_date?: string
          p_inspection_note?: string
          p_warranty_until?: string
          p_note?: string
        }
        Returns: string
      }
      delete_asset: { Args: { p_id: string }; Returns: undefined }
      get_assets: { Args: { p_category?: string }; Returns: Json }
      get_inspection_due: { Args: { p_within_days?: number }; Returns: Json }
      save_staff: {
        Args: {
          p_id: string | null
          p_full_name: string
          p_role?: string
          p_phone?: string
          p_id_no?: string
          p_start_date?: string
          p_end_date?: string
          p_monthly_wage?: number
          p_active?: boolean
          p_note?: string
        }
        Returns: string
      }
      delete_staff: { Args: { p_id: string }; Returns: undefined }
      get_staff: { Args: { p_include_inactive?: boolean }; Returns: Json }
      save_staff_shift: {
        Args: { p_id: string | null; p_staff_id: string; p_date: string; p_start: string; p_end: string; p_note?: string }
        Returns: string
      }
      delete_staff_shift: { Args: { p_id: string }; Returns: undefined }
      get_staff_shifts: { Args: { p_from: string; p_to: string }; Returns: Json }
      save_supplier: {
        Args: {
          p_id: string | null
          p_name: string
          p_category?: string
          p_vkn?: string
          p_phone?: string
          p_email?: string
          p_iban?: string
          p_contact_person?: string
          p_active?: boolean
          p_note?: string
        }
        Returns: string
      }
      delete_supplier: { Args: { p_id: string }; Returns: undefined }
      get_suppliers: { Args: { p_include_inactive?: boolean }; Returns: Json }
      save_supplier_invoice: {
        Args: {
          p_id: string | null
          p_supplier_id: string
          p_amount: number
          p_invoice_no?: string
          p_invoice_date?: string
          p_due_date?: string
          p_description?: string
          p_work_order_id?: string
        }
        Returns: string
      }
      approve_invoice: { Args: { p_id: string }; Returns: undefined }
      reject_invoice: { Args: { p_id: string; p_reason?: string }; Returns: undefined }
      mark_invoice_paid: { Args: { p_id: string; p_paid_date?: string }; Returns: undefined }
      get_supplier_invoices: { Args: { p_status?: string; p_supplier_id?: string }; Returns: Json }
      get_payment_queue: { Args: never; Returns: Json }
      save_assembly: {
        Args: {
          p_id: string | null
          p_title: string
          p_kind?: string
          p_first_meeting_at?: string
          p_second_meeting_at?: string
          p_location?: string
        }
        Returns: string
      }
      publish_assembly_call: { Args: { p_id: string }; Returns: undefined }
      save_assembly_item: {
        Args: {
          p_id: string | null
          p_assembly_id: string
          p_item_no: number
          p_title: string
          p_description?: string
        }
        Returns: string
      }
      delete_assembly_item: { Args: { p_id: string }; Returns: undefined }
      set_item_voting: { Args: { p_item_id: string; p_open: boolean }; Returns: undefined }
      decide_item: { Args: { p_item_id: string; p_decision: string; p_note?: string }; Returns: undefined }
      cast_assembly_vote: { Args: { p_item_id: string; p_unit_id: string; p_choice: string }; Returns: undefined }
      mark_attendance: {
        Args: { p_assembly_id: string; p_unit_id: string; p_present?: boolean; p_proxy_name?: string }
        Returns: undefined
      }
      close_assembly: { Args: { p_id: string; p_status: string; p_minutes?: string }; Returns: undefined }
      get_assemblies: { Args: never; Returns: Json }
      get_assembly_detail: { Args: { p_id: string }; Returns: Json }
      get_my_assembly_ballot: { Args: never; Returns: Json }
      save_board_decision: {
        Args: {
          p_id: string | null
          p_subject: string
          p_body?: string
          p_decision_date?: string
          p_participants?: string
          p_source?: string
          p_assembly_id?: string
        }
        Returns: string
      }
      delete_board_decision: { Args: { p_id: string }; Returns: undefined }
      get_board_decisions: { Args: { p_year?: number }; Returns: Json }
      get_isletme_defteri: { Args: { p_year: number; p_month?: number }; Returns: Json }
      save_vehicle: {
        Args: { p_id: string | null; p_unit_id: string; p_plate: string; p_label?: string; p_active?: boolean }
        Returns: string
      }
      delete_vehicle: { Args: { p_id: string }; Returns: undefined }
      get_my_vehicles: { Args: never; Returns: Json }
      lookup_plate: { Args: { p_plate: string }; Returns: Json }
      create_visitor_pass: {
        Args: { p_unit_id: string; p_visitor_name: string; p_plate?: string; p_expected_date?: string }
        Returns: Json
      }
      cancel_visitor_pass: { Args: { p_id: string }; Returns: undefined }
      get_my_visitor_passes: { Args: never; Returns: Json }
      get_visitor_passes: { Args: { p_date?: string; p_status?: string }; Returns: Json }
      verify_visitor_code: { Args: { p_code: string }; Returns: Json }
      register_package: { Args: { p_unit_id: string; p_carrier?: string; p_description?: string }; Returns: string }
      mark_package_delivered: { Args: { p_id: string; p_note?: string }; Returns: undefined }
      get_packages: { Args: { p_status?: string }; Returns: Json }
      get_my_packages: { Args: never; Returns: Json }
      send_dm: { Args: { p_body: string; p_resident_user_id?: string }; Returns: string }
      get_my_thread: { Args: never; Returns: Json }
      get_dm_threads: { Args: never; Returns: Json }
      get_dm_thread: { Args: { p_resident_user_id: string }; Returns: Json }
      save_meter: {
        Args: { p_id: string | null; p_unit_id: string; p_kind?: string; p_serial_no?: string; p_active?: boolean }
        Returns: string
      }
      delete_meter: { Args: { p_id: string }; Returns: undefined }
      record_meter_reading: {
        Args: { p_meter_id: string; p_reading: number; p_read_at?: string; p_note?: string; p_allow_decrease?: boolean }
        Returns: string
      }
      get_meters: { Args: { p_kind?: string }; Returns: Json }
      get_meter_history: { Args: { p_meter_id: string }; Returns: Json }
      get_my_meters: { Args: never; Returns: Json }
      create_community_post: {
        Args: { p_kind: string; p_title: string; p_body?: string; p_price?: number; p_contact_info?: string; p_photos?: string[]; p_category?: string }
        Returns: string
      }
      close_community_post: { Args: { p_id: string; p_status: string }; Returns: undefined }
      remove_community_post: { Args: { p_id: string; p_reason?: string }; Returns: undefined }
      get_community_posts: { Args: { p_kind?: string; p_category?: string }; Returns: Json }
      save_campaign: {
        Args: {
          p_id: string | null
          p_title: string
          p_vendor_name?: string
          p_description?: string
          p_discount_text?: string
          p_valid_until?: string
          p_active?: boolean
        }
        Returns: string
      }
      delete_campaign: { Args: { p_id: string }; Returns: undefined }
      get_campaigns: { Args: never; Returns: Json }
      open_enforcement: {
        Args: {
          p_unit_id: string
          p_status?: string
          p_case_no?: string
          p_lawyer?: string
          p_note?: string
        }
        Returns: string
      }
      update_enforcement: {
        Args: {
          p_case_id: string
          p_status?: string
          p_case_no?: string
          p_lawyer?: string
          p_note?: string
        }
        Returns: undefined
      }
      get_enforcement_cases: {
        Args: { p_include_closed?: boolean }
        Returns: {
          id: string
          unit_id: string
          block: string
          apartment_number: string
          debtor_name: string
          status: string
          case_no: string
          lawyer: string
          debt_at_open: number
          current_debt: number
          note: string
          opened_at: string
          closed_at: string
        }[]
      }
      save_budget: {
        Args: { p_year: number; p_name?: string; p_note?: string }
        Returns: string
      }
      save_budget_line: {
        Args: {
          p_budget_id: string
          p_label: string
          p_annual_amount: number
          p_distribution?: string
          p_charge_type_id?: string
          p_line_id?: string
          p_note?: string
        }
        Returns: string
      }
      delete_budget_line: { Args: { p_line_id: string }; Returns: undefined }
      get_budget_report: {
        Args: { p_budget_id: string }
        Returns: {
          line_id: string
          label: string
          distribution: string
          charge_type_id: string
          charge_type_name: string
          planned_annual: number
          planned_monthly: number
          accrued_ytd: number
          remaining: number
        }[]
      }
      generate_accruals_from_budget: {
        Args: { p_budget_id: string; p_period_month: number; p_period_year: number; p_due_date: string }
        Returns: Json
      }
      create_company: {
        Args: {
          p_address?: string
          p_email?: string
          p_name: string
          p_phone?: string
          p_tax_office?: string
          p_vkn?: string
        }
        Returns: string
      }
      switch_active_company: { Args: { p_company_id: string }; Returns: string }
      get_my_companies: {
        Args: never
        Returns: {
          company_id: string
          is_active_company: boolean
          name: string
          role: string
          site_count: number
          vkn: string
        }[]
      }
      link_site_to_company: {
        Args: { p_company_id: string; p_site_id: string }
        Returns: undefined
      }
      unlink_site_from_company: { Args: { p_site_id: string }; Returns: undefined }
      get_company_portfolio: {
        Args: { p_company_id?: string }
        Returns: {
          accrued_total: number
          bank_balance: number
          cash_balance: number
          collected_total: number
          open_debt: number
          site_id: string
          site_name: string
        }[]
      }
      _allocate_collection_core: {
        Args: { p_collection_id: string }
        Returns: number
      }
      _assert_site_manager: { Args: { p_site_id: string }; Returns: undefined }
      _generate_accruals_core: {
        Args: {
          p_amount: number
          p_charge_type_id: string
          p_distribution: string
          p_due_date: string
          p_period_month: number
          p_period_year: number
          p_site_id: string
        }
        Returns: number
      }
      _reallocate_site_advances_core: {
        Args: { p_site_id: string }
        Returns: number
      }
      admin_approve_site_deletion: {
        Args: { p_admin_id: string; p_note?: string; p_request_id: string }
        Returns: string
      }
      allocate_collection: {
        Args: { p_collection_id: string }
        Returns: number
      }
      approve_bank_txn_as_collection: {
        Args: { p_txn_id: string; p_unit_id: string }
        Returns: Json
      }
      approve_site_membership: {
        Args: {
          p_approve: boolean
          p_membership_id: string
          p_unit_id?: string
        }
        Returns: undefined
      }
      auth_user_approval_status: { Args: never; Returns: string }
      auth_user_role: { Args: never; Returns: string }
      auth_user_site_id: { Args: never; Returns: string }
      auth_user_unit_id: { Args: never; Returns: string }
      bulk_import_units_residents: { Args: { p_rows: Json }; Returns: Json }
      calculate_late_fees: {
        Args: { p_as_of_date: string; p_site_id: string }
        Returns: number
      }
      cancel_site_deletion_request: {
        Args: { p_request_id: string }
        Returns: Json
      }
      check_auth_rate_limit: {
        Args: { p_key: string; p_max?: number; p_window_seconds?: number }
        Returns: boolean
      }
      clear_auth_rate_limit: { Args: { p_key: string }; Returns: undefined }
      end_tenancy: {
        Args: { p_end_date?: string; p_tenancy_id: string }
        Returns: undefined
      }
      generate_accruals: {
        Args: {
          p_amount: number
          p_charge_type_id: string
          p_distribution: string
          p_due_date: string
          p_period_month: number
          p_period_year: number
          p_site_id: string
        }
        Returns: number
      }
      generate_site_code: { Args: never; Returns: string }
      get_debtors: {
        Args: never
        Returns: {
          amount: number
          anapara: number
          full_name: string
          gecikme: number
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
      get_upcoming_dues: {
        Args: { p_days?: number }
        Returns: {
          amount: number
          apartment_number: string
          block: string
          due_date: string
          full_name: string
          phone: string
          site_id: string
          user_id: string
        }[]
      }
      is_valid_tc: { Args: { p_tc: string }; Returns: boolean }
      record_collection: {
        Args: {
          p_amount: number
          p_cash_account_id?: string
          p_method?: string
          p_paid_at?: string
          p_site_id: string
          p_unit_id: string
        }
        Returns: number
      }
      request_site_deletion: { Args: { p_reason: string }; Returns: Json }
      request_site_membership: { Args: { p_site_code: string }; Returns: Json }
      run_monthly_accruals: {
        Args: { p_month?: number; p_year?: number }
        Returns: {
          accruals_created: number
          note: string
          site_id: string
          site_name: string
        }[]
      }
      set_unit_occupant: {
        Args: {
          p_full_name: string
          p_phone?: string
          p_relationship: string
          p_start_date?: string
          p_tc_kimlik?: string
          p_unit_id: string
          p_user_id?: string
        }
        Returns: string
      }
      switch_active_site: { Args: { p_site_id: string }; Returns: string }
      sync_dues_payment_to_cari: {
        Args: { p_payment_id: string }
        Returns: string
      }
      tc_kimlik_exists: { Args: { p_tc: string }; Returns: boolean }
      transfer_tenant_debt_to_owner: {
        Args: { p_unit_id: string }
        Returns: {
          moved_amount: number
          moved_count: number
        }[]
      }
      transfer_unit_ownership: {
        Args: {
          p_effective_date?: string
          p_move_owner_debt?: boolean
          p_new_full_name: string
          p_new_phone?: string
          p_new_tc?: string
          p_new_user_id?: string
          p_unit_id: string
        }
        Returns: string
      }
      unwaive_accrual: { Args: { p_accrual_id: string }; Returns: undefined }
      update_site_setting: {
        Args: { p_key: string; p_site_id: string; p_value: boolean }
        Returns: Json
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
      validate_tc_kimlik: { Args: { p_tc: string }; Returns: boolean }
      waive_accrual: {
        Args: { p_accrual_id: string; p_reason?: string }
        Returns: undefined
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
  public: {
    Enums: {},
  },
} as const
