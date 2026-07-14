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
          batch_id: string | null
          charge_type_id: string | null
          created_at: string | null
          debtor_type: string
          debtor_user_id: string | null
          description: string | null
          due_date: string
          id: string
          period_month: number | null
          period_year: number | null
          principal_remaining: number
          site_id: string
          status: string
          unit_id: string
          waive_reason: string | null
          waived_at: string | null
          waived_by: string | null
        }
        Insert: {
          amount: number
          batch_id?: string | null
          charge_type_id?: string | null
          created_at?: string | null
          debtor_type: string
          debtor_user_id?: string | null
          description?: string | null
          due_date: string
          id?: string
          period_month?: number | null
          period_year?: number | null
          principal_remaining: number
          site_id: string
          status?: string
          unit_id: string
          waive_reason?: string | null
          waived_at?: string | null
          waived_by?: string | null
        }
        Update: {
          amount?: number
          batch_id?: string | null
          charge_type_id?: string | null
          created_at?: string | null
          debtor_type?: string
          debtor_user_id?: string | null
          description?: string | null
          due_date?: string
          id?: string
          period_month?: number | null
          period_year?: number | null
          principal_remaining?: number
          site_id?: string
          status?: string
          unit_id?: string
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
      announcement_reads: {
        Row: {
          announcement_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
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
          target_block: string | null
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
          target_block?: string | null
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
          target_block?: string | null
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
      assemblies: {
        Row: {
          call_published_at: string | null
          created_at: string
          created_by: string
          first_meeting_at: string | null
          id: string
          kind: string
          location: string | null
          minutes: string | null
          second_meeting_at: string | null
          site_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          call_published_at?: string | null
          created_at?: string
          created_by: string
          first_meeting_at?: string | null
          id?: string
          kind?: string
          location?: string | null
          minutes?: string | null
          second_meeting_at?: string | null
          site_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          call_published_at?: string | null
          created_at?: string
          created_by?: string
          first_meeting_at?: string | null
          id?: string
          kind?: string
          location?: string | null
          minutes?: string | null
          second_meeting_at?: string | null
          site_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assemblies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assemblies_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_attendance: {
        Row: {
          assembly_id: string
          created_at: string
          id: string
          marked_by: string
          present: boolean
          proxy_name: string | null
          site_id: string
          unit_id: string
        }
        Insert: {
          assembly_id: string
          created_at?: string
          id?: string
          marked_by: string
          present?: boolean
          proxy_name?: string | null
          site_id: string
          unit_id: string
        }
        Update: {
          assembly_id?: string
          created_at?: string
          id?: string
          marked_by?: string
          present?: boolean
          proxy_name?: string | null
          site_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assembly_attendance_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assemblies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_attendance_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_attendance_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_balances"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "assembly_attendance_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_items: {
        Row: {
          assembly_id: string
          created_at: string
          decision: string | null
          decision_note: string | null
          description: string | null
          id: string
          item_no: number
          site_id: string
          title: string
          voting_open: boolean
        }
        Insert: {
          assembly_id: string
          created_at?: string
          decision?: string | null
          decision_note?: string | null
          description?: string | null
          id?: string
          item_no: number
          site_id: string
          title: string
          voting_open?: boolean
        }
        Update: {
          assembly_id?: string
          created_at?: string
          decision?: string | null
          decision_note?: string | null
          description?: string | null
          id?: string
          item_no?: number
          site_id?: string
          title?: string
          voting_open?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "assembly_items_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assemblies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_items_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_votes: {
        Row: {
          choice: string
          id: string
          item_id: string
          site_id: string
          source: string
          unit_id: string
          voted_at: string
          voted_by: string
        }
        Insert: {
          choice: string
          id?: string
          item_id: string
          site_id: string
          source?: string
          unit_id: string
          voted_at?: string
          voted_by: string
        }
        Update: {
          choice?: string
          id?: string
          item_id?: string
          site_id?: string
          source?: string
          unit_id?: string
          voted_at?: string
          voted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "assembly_votes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "assembly_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_votes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_votes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_balances"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "assembly_votes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_votes_voted_by_fkey"
            columns: ["voted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          category: string
          created_at: string
          created_by: string
          id: string
          inspection_note: string | null
          location: string | null
          name: string
          next_inspection_date: string | null
          note: string | null
          purchase_date: string | null
          quantity: number
          serial_no: string | null
          site_id: string
          status: string
          updated_at: string
          value: number | null
          warranty_until: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          id?: string
          inspection_note?: string | null
          location?: string | null
          name: string
          next_inspection_date?: string | null
          note?: string | null
          purchase_date?: string | null
          quantity?: number
          serial_no?: string | null
          site_id: string
          status?: string
          updated_at?: string
          value?: number | null
          warranty_until?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          inspection_note?: string | null
          location?: string | null
          name?: string
          next_inspection_date?: string | null
          note?: string | null
          purchase_date?: string | null
          quantity?: number
          serial_no?: string | null
          site_id?: string
          status?: string
          updated_at?: string
          value?: number | null
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_site_id_fkey"
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
      board_decisions: {
        Row: {
          assembly_id: string | null
          body: string | null
          created_at: string
          created_by: string
          decision_date: string
          decision_no: number
          decision_year: number
          id: string
          participants: string | null
          site_id: string
          source: string
          subject: string
          updated_at: string
        }
        Insert: {
          assembly_id?: string | null
          body?: string | null
          created_at?: string
          created_by: string
          decision_date?: string
          decision_no: number
          decision_year: number
          id?: string
          participants?: string | null
          site_id: string
          source?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assembly_id?: string | null
          body?: string | null
          created_at?: string
          created_by?: string
          decision_date?: string
          decision_no?: number
          decision_year?: number
          id?: string
          participants?: string | null
          site_id?: string
          source?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_decisions_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assemblies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_decisions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_decisions_site_id_fkey"
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
      budget_lines: {
        Row: {
          annual_amount: number
          budget_id: string
          charge_type_id: string | null
          created_at: string
          distribution: string
          id: string
          label: string
          note: string | null
          site_id: string
        }
        Insert: {
          annual_amount: number
          budget_id: string
          charge_type_id?: string | null
          created_at?: string
          distribution?: string
          id?: string
          label: string
          note?: string | null
          site_id: string
        }
        Update: {
          annual_amount?: number
          budget_id?: string
          charge_type_id?: string | null
          created_at?: string
          distribution?: string
          id?: string
          label?: string
          note?: string | null
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_charge_type_id_fkey"
            columns: ["charge_type_id"]
            isOneToOne: false
            referencedRelation: "charge_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          note: string | null
          site_id: string
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          note?: string | null
          site_id: string
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          note?: string | null
          site_id?: string
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          description: string | null
          discount_text: string | null
          id: string
          site_id: string
          title: string
          updated_at: string
          valid_until: string | null
          vendor_name: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          discount_text?: string | null
          id?: string
          site_id: string
          title: string
          updated_at?: string
          valid_until?: string | null
          vendor_name?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          discount_text?: string | null
          id?: string
          site_id?: string
          title?: string
          updated_at?: string
          valid_until?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
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
          staff_member_id: string | null
          supplier_invoice_id: string | null
          wage_month: string | null
          work_order_id: string | null
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
          staff_member_id?: string | null
          supplier_invoice_id?: string | null
          wage_month?: string | null
          work_order_id?: string | null
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
          staff_member_id?: string | null
          supplier_invoice_id?: string | null
          wage_month?: string | null
          work_order_id?: string | null
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
          {
            foreignKeyName: "cash_expenses_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_expenses_supplier_invoice_id_fkey"
            columns: ["supplier_invoice_id"]
            isOneToOne: false
            referencedRelation: "supplier_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_expenses_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transfers: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          from_account_id: string
          id: string
          note: string | null
          site_id: string
          to_account_id: string
          transfer_date: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          from_account_id: string
          id?: string
          note?: string | null
          site_id: string
          to_account_id: string
          transfer_date?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          from_account_id?: string
          id?: string
          note?: string | null
          site_id?: string
          to_account_id?: string
          transfer_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliation"
            referencedColumns: ["cash_account_id"]
          },
          {
            foreignKeyName: "cash_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "cash_account_balances"
            referencedColumns: ["cash_account_id"]
          },
          {
            foreignKeyName: "cash_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliation"
            referencedColumns: ["cash_account_id"]
          },
          {
            foreignKeyName: "cash_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "cash_account_balances"
            referencedColumns: ["cash_account_id"]
          },
          {
            foreignKeyName: "cash_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
            foreignKeyName: "collections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
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
      comm_channels: {
        Row: {
          channel: string
          daily_cap_per_site: number
          enabled: boolean
          provider: string | null
          updated_at: string
        }
        Insert: {
          channel: string
          daily_cap_per_site?: number
          enabled?: boolean
          provider?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          daily_cap_per_site?: number
          enabled?: boolean
          provider?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      comm_consents: {
        Row: {
          changed_at: string
          channel: string
          granted: boolean
          id: string
          source: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          channel: string
          granted: boolean
          id?: string
          source?: string
          user_id: string
        }
        Update: {
          changed_at?: string
          channel?: string
          granted?: boolean
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comm_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comm_daily_counters: {
        Row: {
          channel: string
          day: string
          sent_count: number
          site_id: string
        }
        Insert: {
          channel: string
          day: string
          sent_count?: number
          site_id: string
        }
        Update: {
          channel?: string
          day?: string
          sent_count?: number
          site_id?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          author_user_id: string
          body: string | null
          category: string | null
          contact_info: string | null
          created_at: string
          id: string
          kind: string
          photos: string[] | null
          price: number | null
          removed_by: string | null
          removed_reason: string | null
          site_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_user_id: string
          body?: string | null
          category?: string | null
          contact_info?: string | null
          created_at?: string
          id?: string
          kind?: string
          photos?: string[] | null
          price?: number | null
          removed_by?: string | null
          removed_reason?: string | null
          site_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          body?: string | null
          category?: string | null
          contact_info?: string | null
          created_at?: string
          id?: string
          kind?: string
          photos?: string[] | null
          price?: number | null
          removed_by?: string | null
          removed_reason?: string | null
          site_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          tax_office: string | null
          vkn: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          tax_office?: string | null
          vkn?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          tax_office?: string | null
          vkn?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_memberships: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_memberships_user_id_fkey"
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
      direct_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          resident_user_id: string
          sender_is_staff: boolean
          sender_user_id: string
          site_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          resident_user_id: string
          sender_is_staff?: boolean
          sender_user_id: string
          site_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          resident_user_id?: string
          sender_is_staff?: boolean
          sender_user_id?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_resident_user_id_fkey"
            columns: ["resident_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
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
      enforcement_cases: {
        Row: {
          case_no: string | null
          closed_at: string | null
          closed_by: string | null
          debt_at_open: number
          debtor_user_id: string | null
          id: string
          lawyer: string | null
          note: string | null
          opened_at: string
          opened_by: string | null
          site_id: string
          status: string
          unit_id: string
        }
        Insert: {
          case_no?: string | null
          closed_at?: string | null
          closed_by?: string | null
          debt_at_open?: number
          debtor_user_id?: string | null
          id?: string
          lawyer?: string | null
          note?: string | null
          opened_at?: string
          opened_by?: string | null
          site_id: string
          status?: string
          unit_id: string
        }
        Update: {
          case_no?: string | null
          closed_at?: string | null
          closed_by?: string | null
          debt_at_open?: number
          debtor_user_id?: string | null
          id?: string
          lawyer?: string | null
          note?: string | null
          opened_at?: string
          opened_by?: string | null
          site_id?: string
          status?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enforcement_cases_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enforcement_cases_debtor_user_id_fkey"
            columns: ["debtor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enforcement_cases_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enforcement_cases_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enforcement_cases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_balances"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "enforcement_cases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      enforcement_events: {
        Row: {
          body: string
          case_id: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          site_id: string
        }
        Insert: {
          body: string
          case_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          site_id: string
        }
        Update: {
          body?: string
          case_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enforcement_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "enforcement_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enforcement_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enforcement_events_site_id_fkey"
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
      message_outbox: {
        Row: {
          attempts: number
          body: string
          channel: string
          created_at: string
          data: Json
          id: string
          last_error: string | null
          max_attempts: number
          next_attempt_at: string
          provider_message_id: string | null
          sent_at: string | null
          site_id: string | null
          status: string
          subject: string | null
          template_key: string | null
          to_address: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number
          body: string
          channel: string
          created_at?: string
          data?: Json
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string
          provider_message_id?: string | null
          sent_at?: string | null
          site_id?: string | null
          status?: string
          subject?: string | null
          template_key?: string | null
          to_address?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number
          body?: string
          channel?: string
          created_at?: string
          data?: Json
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string
          provider_message_id?: string | null
          sent_at?: string | null
          site_id?: string | null
          status?: string
          subject?: string | null
          template_key?: string | null
          to_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_outbox_channel_fkey"
            columns: ["channel"]
            isOneToOne: false
            referencedRelation: "comm_channels"
            referencedColumns: ["channel"]
          },
          {
            foreignKeyName: "message_outbox_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_outbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          active: boolean
          body: string
          channel: string
          key: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          body: string
          channel: string
          key: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string
          channel?: string
          key?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_channel_fkey"
            columns: ["channel"]
            isOneToOne: false
            referencedRelation: "comm_channels"
            referencedColumns: ["channel"]
          },
        ]
      }
      meter_readings: {
        Row: {
          created_at: string
          created_by: string
          id: string
          meter_id: string
          note: string | null
          read_at: string
          reading: number
          site_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          meter_id: string
          note?: string | null
          read_at?: string
          reading: number
          site_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          meter_id?: string
          note?: string | null
          read_at?: string
          reading?: number
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meter_readings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_readings_meter_id_fkey"
            columns: ["meter_id"]
            isOneToOne: false
            referencedRelation: "meters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_readings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      meters: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          id: string
          kind: string
          serial_no: string | null
          site_id: string
          unit_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          id?: string
          kind?: string
          serial_no?: string | null
          site_id: string
          unit_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          serial_no?: string | null
          site_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meters_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meters_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_balances"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "meters_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
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
      packages: {
        Row: {
          carrier: string | null
          created_at: string
          delivered_at: string | null
          delivered_by: string | null
          delivered_note: string | null
          description: string | null
          id: string
          received_at: string
          received_by: string
          site_id: string
          status: string
          unit_id: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          delivered_by?: string | null
          delivered_note?: string | null
          description?: string | null
          id?: string
          received_at?: string
          received_by: string
          site_id: string
          status?: string
          unit_id: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          delivered_by?: string | null
          delivered_note?: string | null
          description?: string | null
          id?: string
          received_at?: string
          received_by?: string
          site_id?: string
          status?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_delivered_by_fkey"
            columns: ["delivered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_balances"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "packages_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
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
      site_documents: {
        Row: {
          category: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          mime: string | null
          note: string | null
          site_id: string
          size_bytes: number | null
          storage_path: string
          title: string
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          mime?: string | null
          note?: string | null
          site_id: string
          size_bytes?: number | null
          storage_path: string
          title: string
          uploaded_by: string
        }
        Update: {
          category?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          mime?: string | null
          note?: string | null
          site_id?: string
          size_bytes?: number | null
          storage_path?: string
          title?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_documents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "sites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          end_date: string | null
          full_name: string
          id: string
          id_no: string | null
          monthly_wage: number | null
          note: string | null
          phone: string | null
          role: string
          site_id: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          end_date?: string | null
          full_name: string
          id?: string
          id_no?: string | null
          monthly_wage?: number | null
          note?: string | null
          phone?: string | null
          role?: string
          site_id: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          end_date?: string | null
          full_name?: string
          id?: string
          id_no?: string | null
          monthly_wage?: number | null
          note?: string | null
          phone?: string | null
          role?: string
          site_id?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_shifts: {
        Row: {
          created_at: string
          created_by: string | null
          end_time: string
          id: string
          note: string | null
          shift_date: string
          site_id: string
          staff_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_time: string
          id?: string
          note?: string | null
          shift_date: string
          site_id: string
          staff_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_time?: string
          id?: string
          note?: string | null
          shift_date?: string
          site_id?: string
          staff_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_shifts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shifts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
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
      supplier_invoices: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_no: string | null
          paid_at: string | null
          paid_by: string | null
          reject_reason: string | null
          site_id: string
          status: string
          supplier_id: string
          updated_at: string
          work_order_id: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_no?: string | null
          paid_at?: string | null
          paid_by?: string | null
          reject_reason?: string | null
          site_id: string
          status?: string
          supplier_id: string
          updated_at?: string
          work_order_id?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_no?: string | null
          paid_at?: string | null
          paid_by?: string | null
          reject_reason?: string | null
          site_id?: string
          status?: string
          supplier_id?: string
          updated_at?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          category: string
          contact_person: string | null
          created_at: string
          created_by: string
          email: string | null
          iban: string | null
          id: string
          name: string
          note: string | null
          phone: string | null
          site_id: string
          updated_at: string
          vkn: string | null
        }
        Insert: {
          active?: boolean
          category?: string
          contact_person?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          iban?: string | null
          id?: string
          name: string
          note?: string | null
          phone?: string | null
          site_id: string
          updated_at?: string
          vkn?: string | null
        }
        Update: {
          active?: boolean
          category?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          iban?: string | null
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
          site_id?: string
          updated_at?: string
          vkn?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_site_id_fkey"
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
      unit_vehicles: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          id: string
          label: string | null
          plate: string
          site_id: string
          unit_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          id?: string
          label?: string | null
          plate: string
          site_id: string
          unit_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          id?: string
          label?: string | null
          plate?: string
          site_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_vehicles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_vehicles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_vehicles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_balances"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "unit_vehicles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
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
          active_company_id: string | null
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
          active_company_id?: string | null
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
          active_company_id?: string | null
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
            foreignKeyName: "users_active_company_id_fkey"
            columns: ["active_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
      visitor_passes: {
        Row: {
          arrived_at: string | null
          code: string
          created_at: string
          created_by: string
          expected_date: string
          id: string
          plate: string | null
          site_id: string
          status: string
          unit_id: string
          verified_by: string | null
          visitor_name: string
        }
        Insert: {
          arrived_at?: string | null
          code: string
          created_at?: string
          created_by: string
          expected_date?: string
          id?: string
          plate?: string | null
          site_id: string
          status?: string
          unit_id: string
          verified_by?: string | null
          visitor_name: string
        }
        Update: {
          arrived_at?: string | null
          code?: string
          created_at?: string
          created_by?: string
          expected_date?: string
          id?: string
          plate?: string | null
          site_id?: string
          status?: string
          unit_id?: string
          verified_by?: string | null
          visitor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_passes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_passes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_passes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_balances"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "visitor_passes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_passes_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_activity: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          note: string | null
          site_id: string
          work_order_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          site_id: string
          work_order_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          site_id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_activity_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_activity_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_activity_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_templates: {
        Row: {
          active: boolean
          assignee_name: string | null
          assignee_phone: string | null
          created_at: string
          created_by: string
          day_of_month: number
          description: string | null
          due_days: number
          id: string
          interval_months: number
          kind: string
          last_generated_period: string | null
          priority: string
          site_id: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          assignee_name?: string | null
          assignee_phone?: string | null
          created_at?: string
          created_by?: string
          day_of_month?: number
          description?: string | null
          due_days?: number
          id?: string
          interval_months?: number
          kind?: string
          last_generated_period?: string | null
          priority?: string
          site_id: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          assignee_name?: string | null
          assignee_phone?: string | null
          created_at?: string
          created_by?: string
          day_of_month?: number
          description?: string | null
          due_days?: number
          id?: string
          interval_months?: number
          kind?: string
          last_generated_period?: string | null
          priority?: string
          site_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_templates_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          assignee_name: string | null
          assignee_phone: string | null
          assignee_user_id: string | null
          completed_at: string | null
          completed_by: string | null
          cost: number
          cost_note: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          kind: string
          priority: string
          site_id: string
          source_complaint_id: string | null
          status: string
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          assignee_name?: string | null
          assignee_phone?: string | null
          assignee_user_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          cost?: number
          cost_note?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          kind: string
          priority?: string
          site_id: string
          source_complaint_id?: string | null
          status?: string
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          assignee_name?: string | null
          assignee_phone?: string | null
          assignee_user_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          cost?: number
          cost_note?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          kind?: string
          priority?: string
          site_id?: string
          source_complaint_id?: string | null
          status?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_source_complaint_id_fkey"
            columns: ["source_complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_source_complaint_id_fkey"
            columns: ["source_complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints_manager_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_balances"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "work_orders_unit_id_fkey"
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
          kaynak: string | null
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
      _allocate_collection_core: {
        Args: { p_collection_id: string }
        Returns: number
      }
      _assert_budget_write: { Args: { p_budget_id: string }; Returns: string }
      _assert_site_manager: { Args: { p_site_id: string }; Returns: undefined }
      _calculate_late_fees_core: {
        Args: { p_as_of_date: string; p_site_id: string }
        Returns: number
      }
      _generate_accruals_core: {
        Args: {
          p_amount: number
          p_batch_id?: string
          p_charge_type_id: string
          p_debtor_type?: string
          p_distribution: string
          p_due_date: string
          p_period_month: number
          p_period_year: number
          p_site_id: string
        }
        Returns: number
      }
      _link_resident_tenancy: {
        Args: {
          p_apartment: string
          p_block: string
          p_full_name: string
          p_site_id: string
          p_tc: string
          p_user_id: string
        }
        Returns: number
      }
      _my_admin_company_ids: { Args: never; Returns: string[] }
      _my_company_ids: { Args: never; Returns: string[] }
      _occupies_unit: {
        Args: { p_uid: string; p_unit: string }
        Returns: boolean
      }
      _reallocate_site_advances_core: {
        Args: { p_site_id: string }
        Returns: number
      }
      _validate_vkn: { Args: { p_vkn: string }; Returns: undefined }
      add_enforcement_note: {
        Args: { p_case_id: string; p_note: string }
        Returns: undefined
      }
      add_site_document: {
        Args: {
          p_category: string
          p_entity_id?: string
          p_entity_type?: string
          p_mime?: string
          p_note?: string
          p_size_bytes?: number
          p_storage_path: string
          p_title: string
        }
        Returns: string
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
      approve_invoice: { Args: { p_id: string | null }; Returns: undefined }
      approve_site_membership: {
        Args: {
          p_approve: boolean
          p_membership_id: string | null
          p_unit_id?: string
        }
        Returns: undefined
      }
      assign_work_order: {
        Args: {
          p_assignee_name?: string
          p_assignee_phone?: string
          p_assignee_user_id?: string
          p_id: string | null
        }
        Returns: undefined
      }
      auth_user_approval_status: { Args: never; Returns: string }
      auth_user_role: { Args: never; Returns: string }
      auth_user_site_id: { Args: never; Returns: string }
      auth_user_unit_id: { Args: never; Returns: string }
      bulk_import_units_residents: {
        Args: { p_rows: Json; p_update_existing?: boolean }
        Returns: Json
      }
      calculate_late_fees: {
        Args: { p_as_of_date: string; p_site_id: string }
        Returns: number
      }
      cancel_accrual_batch: { Args: { p_batch_id: string }; Returns: number }
      cancel_collection: {
        Args: { p_collection_id: string; p_reason: string }
        Returns: undefined
      }
      cancel_site_deletion_request: {
        Args: { p_request_id: string }
        Returns: Json
      }
      cancel_visitor_pass: { Args: { p_id: string | null }; Returns: undefined }
      cast_assembly_vote: {
        Args: { p_choice: string; p_item_id: string; p_unit_id: string }
        Returns: undefined
      }
      check_auth_rate_limit: {
        Args: { p_key: string; p_max?: number; p_window_seconds?: number }
        Returns: boolean
      }
      claim_outbox_batch: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          body: string
          channel: string
          created_at: string
          data: Json
          id: string
          last_error: string | null
          max_attempts: number
          next_attempt_at: string
          provider_message_id: string | null
          sent_at: string | null
          site_id: string | null
          status: string
          subject: string | null
          template_key: string | null
          to_address: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "message_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      clear_auth_rate_limit: { Args: { p_key: string }; Returns: undefined }
      close_assembly: {
        Args: { p_id: string | null; p_minutes?: string; p_status: string }
        Returns: undefined
      }
      close_community_post: {
        Args: { p_id: string | null; p_status: string }
        Returns: undefined
      }
      convert_complaint_to_work_order: {
        Args: { p_complaint_id: string }
        Returns: string
      }
      create_community_post: {
        Args: {
          p_body?: string
          p_category?: string
          p_contact_info?: string
          p_kind: string
          p_photos?: string[]
          p_price?: number
          p_title: string
        }
        Returns: string
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
      create_unit_accrual: {
        Args: {
          p_amount: number
          p_charge_type_id: string
          p_debtor_type: string
          p_description?: string
          p_due_date: string
          p_unit_id: string
        }
        Returns: string
      }
      create_visitor_pass: {
        Args: {
          p_expected_date?: string
          p_plate?: string
          p_unit_id: string
          p_visitor_name: string
        }
        Returns: Json
      }
      create_work_order: {
        Args: {
          p_description?: string
          p_due_date?: string
          p_kind: string
          p_priority?: string
          p_source_complaint_id?: string
          p_title: string
          p_unit_id?: string
        }
        Returns: string
      }
      decide_item: {
        Args: { p_decision: string; p_item_id: string; p_note?: string }
        Returns: undefined
      }
      delete_assembly_item: { Args: { p_id: string | null }; Returns: undefined }
      delete_asset: { Args: { p_id: string | null }; Returns: undefined }
      delete_board_decision: { Args: { p_id: string | null }; Returns: undefined }
      delete_budget_line: { Args: { p_line_id: string }; Returns: undefined }
      delete_campaign: { Args: { p_id: string | null }; Returns: undefined }
      delete_meter: { Args: { p_id: string | null }; Returns: undefined }
      delete_site_document: { Args: { p_id: string | null }; Returns: string }
      delete_staff: { Args: { p_id: string | null }; Returns: undefined }
      delete_staff_shift: { Args: { p_id: string | null }; Returns: undefined }
      delete_supplier: { Args: { p_id: string | null }; Returns: undefined }
      delete_vehicle: { Args: { p_id: string | null }; Returns: undefined }
      end_tenancy: {
        Args: { p_end_date?: string; p_tenancy_id: string }
        Returns: undefined
      }
      enqueue_message: {
        Args: {
          p_bypass_consent?: boolean
          p_channel: string
          p_params?: Json
          p_site_id: string
          p_template_key: string
          p_user_id: string
        }
        Returns: string
      }
      finalize_outbox: {
        Args: {
          p_error?: string
          p_id: string | null
          p_ok: boolean
          p_provider_message_id?: string
        }
        Returns: undefined
      }
      generate_accruals: {
        Args: {
          p_amount: number
          p_batch_id?: string
          p_charge_type_id: string
          p_debtor_type?: string
          p_distribution: string
          p_due_date: string
          p_period_month: number
          p_period_year: number
          p_site_id: string
        }
        Returns: number
      }
      generate_accruals_from_budget: {
        Args: {
          p_budget_id: string
          p_due_date: string
          p_period_month: number
          p_period_year: number
        }
        Returns: Json
      }
      generate_site_code: { Args: never; Returns: string }
      get_accrual_batches: {
        Args: { p_limit?: number }
        Returns: {
          allocated_amount: number
          batch_id: string
          charge_name: string
          created_at: string
          due_date: string
          period_month: number
          period_year: number
          total_amount: number
          unit_count: number
        }[]
      }
      get_assemblies: { Args: never; Returns: Json }
      get_assembly_detail: { Args: { p_id: string | null }; Returns: Json }
      get_assets: { Args: { p_category?: string }; Returns: Json }
      get_board_decisions: { Args: { p_year?: number }; Returns: Json }
      get_budget_report: {
        Args: { p_budget_id: string }
        Returns: {
          accrued_ytd: number
          charge_type_id: string
          charge_type_name: string
          distribution: string
          label: string
          line_id: string
          planned_annual: number
          planned_monthly: number
          remaining: number
        }[]
      }
      get_campaigns: { Args: never; Returns: Json }
      get_community_posts: {
        Args: { p_category?: string; p_kind?: string }
        Returns: Json
      }
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
      get_dashboard_summary: { Args: never; Returns: Json }
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
      get_dm_thread: { Args: { p_resident_user_id: string }; Returns: Json }
      get_dm_threads: { Args: never; Returns: Json }
      get_enforcement_cases: {
        Args: { p_include_closed?: boolean }
        Returns: {
          apartment_number: string
          block: string
          case_no: string
          closed_at: string
          current_debt: number
          debt_at_open: number
          debtor_name: string
          id: string
          lawyer: string
          note: string
          opened_at: string
          status: string
          unit_id: string
        }[]
      }
      get_enforcement_events: {
        Args: { p_case_id: string }
        Returns: {
          actor_name: string
          body: string
          created_at: string
          id: string
          kind: string
        }[]
      }
      get_inspection_due: { Args: { p_within_days?: number }; Returns: Json }
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
      get_isletme_defteri: {
        Args: { p_month?: number; p_year: number }
        Returns: Json
      }
      get_meter_history: { Args: { p_meter_id: string }; Returns: Json }
      get_meters: { Args: { p_kind?: string }; Returns: Json }
      get_monthly_site_report: {
        Args: { p_month: number; p_year: number }
        Returns: {
          acik_anapara: number
          acik_gecikme: number
          acik_sikayet: number
          avans_toplam: number
          donem: string
          gider_toplam: number
          manager_emails: string[]
          net: number
          site_id: string
          site_name: string
          tahsilat_adet: number
          tahsilat_toplam: number
        }[]
      }
      get_my_assembly_ballot: { Args: never; Returns: Json }
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
      get_my_meters: { Args: never; Returns: Json }
      get_my_packages: { Args: never; Returns: Json }
      get_my_thread: { Args: never; Returns: Json }
      get_my_vehicles: { Args: never; Returns: Json }
      get_my_visitor_passes: { Args: never; Returns: Json }
      get_packages: { Args: { p_status?: string }; Returns: Json }
      get_payment_queue: { Args: never; Returns: Json }
      get_recent_activity: {
        Args: { p_limit?: number }
        Returns: {
          actor_name: string
          amount: number
          description: string
          happened_at: string
          kind: string
        }[]
      }
      get_site_documents: {
        Args: {
          p_category?: string
          p_entity_id?: string
          p_entity_type?: string
        }
        Returns: Json
      }
      get_site_transparency: { Args: never; Returns: Json }
      get_staff: { Args: { p_include_inactive?: boolean }; Returns: Json }
      get_staff_shifts: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      get_supplier_invoices: {
        Args: { p_status?: string; p_supplier_id?: string }
        Returns: Json
      }
      get_suppliers: { Args: { p_include_inactive?: boolean }; Returns: Json }
      get_unit_shared_debt: { Args: never; Returns: Json }
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
      get_visitor_passes: {
        Args: { p_date?: string; p_status?: string }
        Returns: Json
      }
      get_wage_queue: {
        Args: { p_month?: string }
        Returns: {
          account_name: string
          full_name: string
          monthly_wage: number
          paid: boolean
          paid_date: string
          role: string
          staff_id: string
        }[]
      }
      get_work_order_detail: { Args: { p_id: string | null }; Returns: Json }
      get_work_orders: { Args: { p_status?: string }; Returns: Json }
      is_valid_tc: { Args: { p_tc: string }; Returns: boolean }
      link_site_to_company: {
        Args: { p_company_id: string; p_site_id: string }
        Returns: undefined
      }
      lookup_plate: { Args: { p_plate: string }; Returns: Json }
      mark_attendance: {
        Args: {
          p_assembly_id: string
          p_present?: boolean
          p_proxy_name?: string
          p_unit_id: string
        }
        Returns: undefined
      }
      mark_invoice_paid: {
        Args: { p_cash_account_id?: string; p_id: string | null; p_paid_date?: string }
        Returns: undefined
      }
      mark_package_delivered: {
        Args: { p_id: string | null; p_note?: string }
        Returns: undefined
      }
      open_enforcement: {
        Args: {
          p_case_no?: string
          p_lawyer?: string
          p_note?: string
          p_status?: string
          p_unit_id: string
        }
        Returns: string
      }
      pay_staff_wage: {
        Args: {
          p_cash_account_id: string
          p_month?: string
          p_paid_date?: string
          p_staff_id: string
        }
        Returns: string
      }
      publish_assembly_call: { Args: { p_id: string | null }; Returns: undefined }
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
      record_meter_reading: {
        Args: {
          p_allow_decrease?: boolean
          p_meter_id: string
          p_note?: string
          p_read_at?: string
          p_reading: number
        }
        Returns: string
      }
      register_package: {
        Args: { p_carrier?: string; p_description?: string; p_unit_id: string }
        Returns: string
      }
      reject_invoice: {
        Args: { p_id: string | null; p_reason?: string }
        Returns: undefined
      }
      remove_community_post: {
        Args: { p_id: string | null; p_reason?: string }
        Returns: undefined
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
      run_monthly_late_fees: {
        Args: { p_as_of_date?: string }
        Returns: {
          fees_added: number
          note: string
          site_id: string
          site_name: string
        }[]
      }
      run_work_order_templates: {
        Args: { p_as_of?: string }
        Returns: {
          created: number
          site_id: string
        }[]
      }
      save_assembly: {
        Args: {
          p_first_meeting_at?: string
          p_id: string | null
          p_kind?: string
          p_location?: string
          p_second_meeting_at?: string
          p_title: string
        }
        Returns: string
      }
      save_assembly_item: {
        Args: {
          p_assembly_id: string
          p_description?: string
          p_id: string | null
          p_item_no: number
          p_title: string
        }
        Returns: string
      }
      save_asset: {
        Args: {
          p_category?: string
          p_id: string | null
          p_inspection_note?: string
          p_location?: string
          p_name: string
          p_next_inspection_date?: string
          p_note?: string
          p_purchase_date?: string
          p_quantity?: number
          p_serial_no?: string
          p_status?: string
          p_value?: number
          p_warranty_until?: string
        }
        Returns: string
      }
      save_board_decision: {
        Args: {
          p_assembly_id?: string
          p_body?: string
          p_decision_date?: string
          p_id: string | null
          p_participants?: string
          p_source?: string
          p_subject: string
        }
        Returns: string
      }
      save_budget: {
        Args: { p_name?: string; p_note?: string; p_year: number }
        Returns: string
      }
      save_budget_line: {
        Args: {
          p_annual_amount: number
          p_budget_id: string
          p_charge_type_id?: string
          p_distribution?: string
          p_label: string
          p_line_id?: string
          p_note?: string
        }
        Returns: string
      }
      save_campaign: {
        Args: {
          p_active?: boolean
          p_description?: string
          p_discount_text?: string
          p_id: string | null
          p_title: string
          p_valid_until?: string
          p_vendor_name?: string
        }
        Returns: string
      }
      save_meter: {
        Args: {
          p_active?: boolean
          p_id: string | null
          p_kind?: string
          p_serial_no?: string
          p_unit_id: string
        }
        Returns: string
      }
      save_staff: {
        Args: {
          p_active?: boolean
          p_end_date?: string
          p_full_name: string
          p_id: string | null
          p_id_no?: string
          p_monthly_wage?: number
          p_note?: string
          p_phone?: string
          p_role?: string
          p_start_date?: string
        }
        Returns: string
      }
      save_staff_shift: {
        Args: {
          p_date: string
          p_end: string
          p_id: string | null
          p_note?: string
          p_staff_id: string
          p_start: string
        }
        Returns: string
      }
      save_supplier: {
        Args: {
          p_active?: boolean
          p_category?: string
          p_contact_person?: string
          p_email?: string
          p_iban?: string
          p_id: string | null
          p_name: string
          p_note?: string
          p_phone?: string
          p_vkn?: string
        }
        Returns: string
      }
      save_supplier_invoice: {
        Args: {
          p_amount: number
          p_description?: string
          p_due_date?: string
          p_id: string | null
          p_invoice_date?: string
          p_invoice_no?: string
          p_supplier_id: string
          p_work_order_id?: string
        }
        Returns: string
      }
      save_vehicle: {
        Args: {
          p_active?: boolean
          p_id: string | null
          p_label?: string
          p_plate: string
          p_unit_id: string
        }
        Returns: string
      }
      send_dm: {
        Args: { p_body: string; p_resident_user_id?: string }
        Returns: string
      }
      set_gate_role: {
        Args: { p_enable: boolean; p_user_id: string }
        Returns: undefined
      }
      set_item_voting: {
        Args: { p_item_id: string; p_open: boolean }
        Returns: undefined
      }
      set_ledger_lock: {
        Args: { p_locked_until: string; p_site_id: string }
        Returns: undefined
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
      set_work_order_cost: {
        Args: {
          p_cash_account_id?: string
          p_cost: number
          p_cost_note?: string
          p_expense_date?: string
          p_id: string | null
        }
        Returns: undefined
      }
      switch_active_company: { Args: { p_company_id: string }; Returns: string }
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
      unlink_site_from_company: {
        Args: { p_site_id: string }
        Returns: undefined
      }
      unwaive_accrual: { Args: { p_accrual_id: string }; Returns: undefined }
      update_enforcement: {
        Args: {
          p_case_id: string
          p_case_no?: string
          p_lawyer?: string
          p_note?: string
          p_status?: string
        }
        Returns: undefined
      }
      update_site_setting: {
        Args: { p_key: string; p_site_id: string; p_value: boolean }
        Returns: Json
      }
      update_work_order_status: {
        Args: { p_id: string | null; p_note?: string; p_status: string }
        Returns: undefined
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
      verify_visitor_code: { Args: { p_code: string }; Returns: Json }
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
