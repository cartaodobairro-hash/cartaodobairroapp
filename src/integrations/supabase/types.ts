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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          detail: string | null
          id: string
          module: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          detail?: string | null
          id?: string
          module?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string | null
          id?: string
          module?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          city: string | null
          clicks: number
          created_at: string
          end_date: string | null
          id: string
          image_url: string | null
          impressions: number
          link: string | null
          media_type: string
          partner_id: string | null
          sort_order: number
          start_date: string | null
          status: Database["public"]["Enums"]["generic_status"]
          subtitle: string | null
          title: string
          type: string
        }
        Insert: {
          city?: string | null
          clicks?: number
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          link?: string | null
          media_type?: string
          partner_id?: string | null
          sort_order?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["generic_status"]
          subtitle?: string | null
          title: string
          type?: string
        }
        Update: {
          city?: string | null
          clicks?: number
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          link?: string | null
          media_type?: string
          partner_id?: string | null
          sort_order?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["generic_status"]
          subtitle?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "banners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      benefits: {
        Row: {
          created_at: string
          description: string | null
          discount_percentage: number
          discount_price: number | null
          id: string
          normal_price: number | null
          partner_id: string
          requires_scheduling: boolean
          rules: string | null
          status: Database["public"]["Enums"]["generic_status"]
          title: string
          updated_at: string
          usage_limit: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percentage?: number
          discount_price?: number | null
          id?: string
          normal_price?: number | null
          partner_id: string
          requires_scheduling?: boolean
          rules?: string | null
          status?: Database["public"]["Enums"]["generic_status"]
          title: string
          updated_at?: string
          usage_limit?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percentage?: number
          discount_price?: number | null
          id?: string
          normal_price?: number | null
          partner_id?: string
          requires_scheduling?: boolean
          rules?: string | null
          status?: Database["public"]["Enums"]["generic_status"]
          title?: string
          updated_at?: string
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "benefits_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      card_usage: {
        Row: {
          amount_saved: number
          benefit_id: string | null
          card_id: string
          customer_id: string
          dependent_id: string | null
          employee_id: string | null
          id: string
          partner_id: string
          purchase_amount: number | null
          used_at: string
        }
        Insert: {
          amount_saved?: number
          benefit_id?: string | null
          card_id: string
          customer_id: string
          dependent_id?: string | null
          employee_id?: string | null
          id?: string
          partner_id: string
          purchase_amount?: number | null
          used_at?: string
        }
        Update: {
          amount_saved?: number
          benefit_id?: string | null
          card_id?: string
          customer_id?: string
          dependent_id?: string | null
          employee_id?: string | null
          id?: string
          partner_id?: string
          purchase_amount?: number | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_usage_benefit_id_fkey"
            columns: ["benefit_id"]
            isOneToOne: false
            referencedRelation: "benefits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_usage_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_usage_dependent_id_fkey"
            columns: ["dependent_id"]
            isOneToOne: false
            referencedRelation: "dependents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_usage_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_usage_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          card_number: string
          created_at: string
          customer_id: string
          expires_at: string | null
          id: string
          issued_at: string
          qr_token: string
          status: Database["public"]["Enums"]["card_status"]
        }
        Insert: {
          card_number: string
          created_at?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          qr_token?: string
          status?: Database["public"]["Enums"]["card_status"]
        }
        Update: {
          card_number?: string
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          qr_token?: string
          status?: Database["public"]["Enums"]["card_status"]
        }
        Relationships: [
          {
            foreignKeyName: "cards_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_balances: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          opening_amount: number
          reference_month: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          opening_amount?: number
          reference_month: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          opening_amount?: number
          reference_month?: string
          updated_at?: string
        }
        Relationships: []
      }
      cash_flow_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          status: Database["public"]["Enums"]["generic_status"]
          type: Database["public"]["Enums"]["cash_flow_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          status?: Database["public"]["Enums"]["generic_status"]
          type: Database["public"]["Enums"]["cash_flow_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["generic_status"]
          type?: Database["public"]["Enums"]["cash_flow_type"]
          updated_at?: string
        }
        Relationships: []
      }
      cash_flow_entries: {
        Row: {
          amount: number
          category_id: string | null
          competence_date: string
          counterparty: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string
          due_date: string
          expected_date: string | null
          id: string
          notes: string | null
          payment_method: string | null
          plan_id: string | null
          recurrence: Database["public"]["Enums"]["cash_flow_recurrence"]
          recurrence_end: string | null
          seller_id: string | null
          settled_at: string | null
          status: Database["public"]["Enums"]["cash_flow_status"]
          type: Database["public"]["Enums"]["cash_flow_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          competence_date: string
          counterparty?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description: string
          due_date: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          plan_id?: string | null
          recurrence?: Database["public"]["Enums"]["cash_flow_recurrence"]
          recurrence_end?: string | null
          seller_id?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["cash_flow_status"]
          type: Database["public"]["Enums"]["cash_flow_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          competence_date?: string
          counterparty?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string
          due_date?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          plan_id?: string | null
          recurrence?: Database["public"]["Enums"]["cash_flow_recurrence"]
          recurrence_end?: string | null
          seller_id?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["cash_flow_status"]
          type?: Database["public"]["Enums"]["cash_flow_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          name: string
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["generic_status"]
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["generic_status"]
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["generic_status"]
        }
        Relationships: []
      }
      customers: {
        Row: {
          cep: string | null
          city: string | null
          complement: string | null
          created_at: string
          document_url: string | null
          id: string
          neighborhood: string | null
          number: string | null
          plan_id: string | null
          reference: string | null
          referral_code: string | null
          residence_proof_url: string | null
          selfie_url: string | null
          seller_id: string | null
          state: string | null
          status: Database["public"]["Enums"]["generic_status"]
          street: string | null
          terms_accepted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          document_url?: string | null
          id?: string
          neighborhood?: string | null
          number?: string | null
          plan_id?: string | null
          reference?: string | null
          referral_code?: string | null
          residence_proof_url?: string | null
          selfie_url?: string | null
          seller_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["generic_status"]
          street?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          document_url?: string | null
          id?: string
          neighborhood?: string | null
          number?: string | null
          plan_id?: string | null
          reference?: string | null
          referral_code?: string | null
          residence_proof_url?: string | null
          selfie_url?: string | null
          seller_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["generic_status"]
          street?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      dependents: {
        Row: {
          added_at: string
          birth_date: string | null
          cpf: string | null
          created_at: string
          customer_id: string
          id: string
          name: string
          photo_url: string | null
          relationship: string | null
          removed_at: string | null
          status: Database["public"]["Enums"]["generic_status"]
        }
        Insert: {
          added_at?: string
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          customer_id: string
          id?: string
          name: string
          photo_url?: string | null
          relationship?: string | null
          removed_at?: string | null
          status?: Database["public"]["Enums"]["generic_status"]
        }
        Update: {
          added_at?: string
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          name?: string
          photo_url?: string | null
          relationship?: string | null
          removed_at?: string | null
          status?: Database["public"]["Enums"]["generic_status"]
        }
        Relationships: [
          {
            foreignKeyName: "dependents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          can_manage_benefits: boolean
          can_validate: boolean
          can_view_reports: boolean
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          partner_id: string
          phone: string | null
          role: string | null
          status: Database["public"]["Enums"]["generic_status"]
          user_id: string | null
        }
        Insert: {
          can_manage_benefits?: boolean
          can_validate?: boolean
          can_view_reports?: boolean
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          partner_id: string
          phone?: string | null
          role?: string | null
          status?: Database["public"]["Enums"]["generic_status"]
          user_id?: string | null
        }
        Update: {
          can_manage_benefits?: boolean
          can_validate?: boolean
          can_view_reports?: boolean
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          partner_id?: string
          phone?: string | null
          role?: string | null
          status?: Database["public"]["Enums"]["generic_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          partner_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          partner_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          partner_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          category_id: string | null
          cep: string | null
          city: string | null
          cnpj: string | null
          company_name: string
          complement: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          instagram: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          neighborhood: string | null
          number: string | null
          opening_hours: string | null
          phone: string | null
          rating: number
          reviews_count: number
          seller_id: string | null
          sponsored: boolean
          state: string | null
          status: Database["public"]["Enums"]["partner_status"]
          street: string | null
          trade_name: string
          updated_at: string
          user_id: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          category_id?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          company_name: string
          complement?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          neighborhood?: string | null
          number?: string | null
          opening_hours?: string | null
          phone?: string | null
          rating?: number
          reviews_count?: number
          seller_id?: string | null
          sponsored?: boolean
          state?: string | null
          status?: Database["public"]["Enums"]["partner_status"]
          street?: string | null
          trade_name: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          category_id?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          company_name?: string
          complement?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          neighborhood?: string | null
          number?: string | null
          opening_hours?: string | null
          phone?: string | null
          rating?: number
          reviews_count?: number
          seller_id?: string | null
          sponsored?: boolean
          state?: string | null
          status?: Database["public"]["Enums"]["partner_status"]
          street?: string | null
          trade_name?: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          method: string
          paid_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string | null
          transaction_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id: string
          id?: string
          method?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          method?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          highlights: string[]
          id: string
          max_dependents: number
          name: string
          payment_link: string | null
          period: string
          price: number
          rules: string | null
          sort_order: number
          status: Database["public"]["Enums"]["generic_status"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          highlights?: string[]
          id?: string
          max_dependents?: number
          name: string
          payment_link?: string | null
          period?: string
          price?: number
          rules?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["generic_status"]
        }
        Update: {
          created_at?: string
          description?: string | null
          highlights?: string[]
          id?: string
          max_dependents?: number
          name?: string
          payment_link?: string | null
          period?: string
          price?: number
          rules?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["generic_status"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_date: string | null
          cpf: string | null
          created_at: string
          email: string | null
          gender: string | null
          id: string
          name: string
          phone: string | null
          photo_url: string | null
          status: Database["public"]["Enums"]["generic_status"]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["generic_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["generic_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          partner_id: string
          rating: number
          status: Database["public"]["Enums"]["generic_status"]
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          partner_id: string
          rating: number
          status?: Database["public"]["Enums"]["generic_status"]
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          partner_id?: string
          rating?: number
          status?: Database["public"]["Enums"]["generic_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_commissions: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          paid_at: string | null
          percentage: number
          sale_id: string | null
          seller_id: string
          status: Database["public"]["Enums"]["commission_status"]
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          paid_at?: string | null
          percentage?: number
          sale_id?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["commission_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          paid_at?: string | null
          percentage?: number
          sale_id?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["commission_status"]
        }
        Relationships: [
          {
            foreignKeyName: "seller_commissions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "seller_sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_commissions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_goals: {
        Row: {
          achieved: number
          end_date: string | null
          id: string
          seller_id: string
          start_date: string
          status: Database["public"]["Enums"]["generic_status"]
          target: number
          type: string
        }
        Insert: {
          achieved?: number
          end_date?: string | null
          id?: string
          seller_id: string
          start_date?: string
          status?: Database["public"]["Enums"]["generic_status"]
          target?: number
          type?: string
        }
        Update: {
          achieved?: number
          end_date?: string | null
          id?: string
          seller_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["generic_status"]
          target?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_goals_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_leads: {
        Row: {
          address: string | null
          birth_date: string | null
          city: string | null
          cpf: string | null
          created_at: string
          customer_id: string | null
          email: string | null
          id: string
          last_contact_at: string | null
          name: string
          neighborhood: string | null
          next_contact_at: string | null
          notes: string | null
          payment_method: string | null
          phone: string | null
          plan_id: string | null
          proposal_token: string
          sale_date: string
          seller_id: string
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          last_contact_at?: string | null
          name: string
          neighborhood?: string | null
          next_contact_at?: string | null
          notes?: string | null
          payment_method?: string | null
          phone?: string | null
          plan_id?: string | null
          proposal_token?: string
          sale_date?: string
          seller_id: string
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          last_contact_at?: string | null
          name?: string
          neighborhood?: string | null
          next_contact_at?: string | null
          notes?: string | null
          payment_method?: string | null
          phone?: string | null
          plan_id?: string | null
          proposal_token?: string
          sale_date?: string
          seller_id?: string
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_leads_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_leads_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_sales: {
        Row: {
          amount: number
          commission_amount: number
          created_at: string
          customer_id: string | null
          id: string
          plan_id: string | null
          seller_id: string
          source: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string | null
        }
        Insert: {
          amount?: number
          commission_amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          plan_id?: string | null
          seller_id: string
          source?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          commission_amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          plan_id?: string | null
          seller_id?: string
          source?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_sales_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_sales_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          bank_account: string | null
          bank_branch: string | null
          bank_document: string | null
          bank_holder: string | null
          bank_name: string | null
          bank_pix_key: string | null
          city: string | null
          commission_type: string
          commission_value: number
          cpf: string | null
          created_at: string
          email: string | null
          goal: number
          id: string
          name: string
          neighborhood: string | null
          phone: string | null
          photo_url: string | null
          seller_code: string
          status: Database["public"]["Enums"]["generic_status"]
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          bank_account?: string | null
          bank_branch?: string | null
          bank_document?: string | null
          bank_holder?: string | null
          bank_name?: string | null
          bank_pix_key?: string | null
          city?: string | null
          commission_type?: string
          commission_value?: number
          cpf?: string | null
          created_at?: string
          email?: string | null
          goal?: number
          id?: string
          name: string
          neighborhood?: string | null
          phone?: string | null
          photo_url?: string | null
          seller_code: string
          status?: Database["public"]["Enums"]["generic_status"]
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          bank_account?: string | null
          bank_branch?: string | null
          bank_document?: string | null
          bank_holder?: string | null
          bank_name?: string | null
          bank_pix_key?: string | null
          city?: string | null
          commission_type?: string
          commission_value?: number
          cpf?: string | null
          created_at?: string
          email?: string | null
          goal?: number
          id?: string
          name?: string
          neighborhood?: string | null
          phone?: string | null
          photo_url?: string | null
          seller_code?: string
          status?: Database["public"]["Enums"]["generic_status"]
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          next_due_date: string | null
          payment_method: string | null
          plan_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["generic_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id: string
          id?: string
          next_due_date?: string | null
          payment_method?: string | null
          plan_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["generic_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          next_due_date?: string | null
          payment_method?: string | null
          plan_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["generic_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          answer: string | null
          category: string
          created_at: string
          id: string
          message: string
          status: Database["public"]["Enums"]["generic_status"]
          subject: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          status?: Database["public"]["Enums"]["generic_status"]
          subject: string
          user_id: string
        }
        Update: {
          answer?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: Database["public"]["Enums"]["generic_status"]
          subject?: string
          user_id?: string
        }
        Relationships: []
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
      activate_subscription_by_email: {
        Args: { _amount?: number; _email: string; _transaction_id?: string }
        Returns: boolean
      }
      activate_subscription_by_id: {
        Args: {
          _amount?: number
          _payment_id?: string
          _subscription_id: string
          _transaction_id?: string
        }
        Returns: boolean
      }
      claim_seller_proposal: {
        Args: { _proposal_token?: string; _seller_code?: string }
        Returns: string
      }
      delete_subscription_with_payments: {
        Args: { _subscription_id: string }
        Returns: boolean
      }
      generate_card_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      lookup_card_for_validation: {
        Args: { _code: string }
        Returns: {
          card_number: string
          customer_id: string
          expires_at: string
          id: string
          status: Database["public"]["Enums"]["card_status"]
        }[]
      }
      owns_customer: { Args: { _customer_id: string }; Returns: boolean }
      owns_partner: { Args: { _partner_id: string }; Returns: boolean }
      owns_seller: { Args: { _seller_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "financeiro"
        | "partner"
        | "employee"
        | "seller"
        | "customer"
      card_status: "ativo" | "pendente" | "bloqueado" | "expirado"
      cash_flow_recurrence:
        | "nenhuma"
        | "mensal"
        | "trimestral"
        | "semestral"
        | "anual"
      cash_flow_status: "previsto" | "pago" | "cancelado"
      cash_flow_type: "receita" | "despesa"
      commission_status:
        | "pendente"
        | "aprovada"
        | "liberada"
        | "paga"
        | "cancelada"
        | "estornada"
      generic_status:
        | "ativo"
        | "pendente"
        | "bloqueado"
        | "inativo"
        | "cancelado"
      lead_status:
        | "novo"
        | "contato"
        | "interessado"
        | "cadastro"
        | "pagamento"
        | "ativo"
        | "perdido"
      partner_status: "pendente" | "aprovado" | "reprovado" | "suspenso"
      payment_status: "pago" | "pendente" | "falhou" | "estornado" | "cancelado"
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
      app_role: [
        "super_admin",
        "admin",
        "financeiro",
        "partner",
        "employee",
        "seller",
        "customer",
      ],
      card_status: ["ativo", "pendente", "bloqueado", "expirado"],
      cash_flow_recurrence: [
        "nenhuma",
        "mensal",
        "trimestral",
        "semestral",
        "anual",
      ],
      cash_flow_status: ["previsto", "pago", "cancelado"],
      cash_flow_type: ["receita", "despesa"],
      commission_status: [
        "pendente",
        "aprovada",
        "liberada",
        "paga",
        "cancelada",
        "estornada",
      ],
      generic_status: [
        "ativo",
        "pendente",
        "bloqueado",
        "inativo",
        "cancelado",
      ],
      lead_status: [
        "novo",
        "contato",
        "interessado",
        "cadastro",
        "pagamento",
        "ativo",
        "perdido",
      ],
      partner_status: ["pendente", "aprovado", "reprovado", "suspenso"],
      payment_status: ["pago", "pendente", "falhou", "estornado", "cancelado"],
    },
  },
} as const
