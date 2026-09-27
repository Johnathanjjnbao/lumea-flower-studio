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
      admin_profiles: {
        Row: {
          active: boolean
          auth_user_id: string
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          auth_user_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          role: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          auth_user_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
        }
        Relationships: []
      }
      flower_stem_translations: {
        Row: {
          created_at: string
          description: string | null
          flower_stem_id: string
          image_alt: string
          locale: Database["public"]["Enums"]["locale_code"]
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          flower_stem_id: string
          image_alt: string
          locale: Database["public"]["Enums"]["locale_code"]
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          flower_stem_id?: string
          image_alt?: string
          locale?: Database["public"]["Enums"]["locale_code"]
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flower_stem_translations_flower_stem_id_fkey"
            columns: ["flower_stem_id"]
            isOneToOne: false
            referencedRelation: "flower_stems"
            referencedColumns: ["id"]
          },
        ]
      }
      flower_stems: {
        Row: {
          archived_at: string | null
          availability: Database["public"]["Enums"]["availability_status"]
          created_at: string
          id: string
          media_asset_id: string | null
          price_per_stem_amount: number
          published_at: string | null
          seasonal_note_required: boolean
          sort_order: number
          stable_code: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_status"]
        }
        Insert: {
          archived_at?: string | null
          availability?: Database["public"]["Enums"]["availability_status"]
          created_at?: string
          id?: string
          media_asset_id?: string | null
          price_per_stem_amount: number
          published_at?: string | null
          seasonal_note_required?: boolean
          sort_order?: number
          stable_code: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_status"]
        }
        Update: {
          archived_at?: string | null
          availability?: Database["public"]["Enums"]["availability_status"]
          created_at?: string
          id?: string
          media_asset_id?: string | null
          price_per_stem_amount?: number
          published_at?: string | null
          seasonal_note_required?: boolean
          sort_order?: number
          stable_code?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_status"]
        }
        Relationships: [
          {
            foreignKeyName: "flower_stems_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      media_asset_translations: {
        Row: {
          alt_text: string
          caption: string | null
          created_at: string
          locale: Database["public"]["Enums"]["locale_code"]
          media_asset_id: string
          updated_at: string
        }
        Insert: {
          alt_text: string
          caption?: string | null
          created_at?: string
          locale: Database["public"]["Enums"]["locale_code"]
          media_asset_id: string
          updated_at?: string
        }
        Update: {
          alt_text?: string
          caption?: string | null
          created_at?: string
          locale?: Database["public"]["Enums"]["locale_code"]
          media_asset_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_asset_translations_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          access: Database["public"]["Enums"]["media_access"]
          archived_at: string | null
          byte_size: number | null
          checksum: string | null
          created_at: string
          height: number | null
          id: string
          mime_type: string
          status: Database["public"]["Enums"]["media_status"]
          storage_bucket: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          access: Database["public"]["Enums"]["media_access"]
          archived_at?: string | null
          byte_size?: number | null
          checksum?: string | null
          created_at?: string
          height?: number | null
          id?: string
          mime_type: string
          status?: Database["public"]["Enums"]["media_status"]
          storage_bucket: string
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          access?: Database["public"]["Enums"]["media_access"]
          archived_at?: string | null
          byte_size?: number | null
          checksum?: string | null
          created_at?: string
          height?: number | null
          id?: string
          mime_type?: string
          status?: Database["public"]["Enums"]["media_status"]
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      occasion_translations: {
        Row: {
          created_at: string
          description: string | null
          image_alt: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          name: string
          occasion_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          image_alt?: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          name: string
          occasion_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          image_alt?: string | null
          locale?: Database["public"]["Enums"]["locale_code"]
          name?: string
          occasion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "occasion_translations_occasion_id_fkey"
            columns: ["occasion_id"]
            isOneToOne: false
            referencedRelation: "occasions"
            referencedColumns: ["id"]
          },
        ]
      }
      occasions: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          media_asset_id: string | null
          published_at: string | null
          slug: string
          sort_order: number
          stable_code: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_status"]
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          media_asset_id?: string | null
          published_at?: string | null
          slug: string
          sort_order?: number
          stable_code: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_status"]
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          media_asset_id?: string | null
          published_at?: string | null
          slug?: string
          sort_order?: number
          stable_code?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_status"]
        }
        Relationships: [
          {
            foreignKeyName: "occasions_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          active: boolean
          created_at: string
          id: string
          media_asset_id: string
          product_id: string
          role: Database["public"]["Enums"]["product_image_role"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          media_asset_id: string
          product_id: string
          role?: Database["public"]["Enums"]["product_image_role"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          media_asset_id?: string
          product_id?: string
          role?: Database["public"]["Enums"]["product_image_role"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_occasions: {
        Row: {
          created_at: string
          occasion_id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          occasion_id: string
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          occasion_id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_occasions_occasion_id_fkey"
            columns: ["occasion_id"]
            isOneToOne: false
            referencedRelation: "occasions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_occasions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tones: {
        Row: {
          active: boolean
          created_at: string
          product_id: string
          sort_order: number
          tone_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          product_id: string
          sort_order?: number
          tone_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          product_id?: string
          sort_order?: number
          tone_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tones_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tones_tone_id_fkey"
            columns: ["tone_id"]
            isOneToOne: false
            referencedRelation: "tones"
            referencedColumns: ["id"]
          },
        ]
      }
      product_translations: {
        Row: {
          composition: string[]
          created_at: string
          description: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          name: string
          product_id: string
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          updated_at: string
        }
        Insert: {
          composition?: string[]
          created_at?: string
          description?: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          name: string
          product_id: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          updated_at?: string
        }
        Update: {
          composition?: string[]
          created_at?: string
          description?: string | null
          locale?: Database["public"]["Enums"]["locale_code"]
          name?: string
          product_id?: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_translations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant_translations: {
        Row: {
          created_at: string
          description: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          name: string
          product_variant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          name: string
          product_variant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          locale?: Database["public"]["Enums"]["locale_code"]
          name?: string
          product_variant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_translations_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          active: boolean
          created_at: string
          id: string
          price_amount: number
          product_id: string
          sort_order: number
          stable_code: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          price_amount: number
          product_id: string
          sort_order?: number
          stable_code: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          price_amount?: number
          product_id?: string
          sort_order?: number
          stable_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived_at: string | null
          availability: Database["public"]["Enums"]["availability_status"]
          bestseller: boolean
          created_at: string
          featured: boolean
          id: string
          product_type: Database["public"]["Enums"]["product_type"]
          published_at: string | null
          same_day_eligible: boolean
          slug: string
          sort_order: number
          stable_code: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_status"]
        }
        Insert: {
          archived_at?: string | null
          availability?: Database["public"]["Enums"]["availability_status"]
          bestseller?: boolean
          created_at?: string
          featured?: boolean
          id?: string
          product_type?: Database["public"]["Enums"]["product_type"]
          published_at?: string | null
          same_day_eligible?: boolean
          slug: string
          sort_order?: number
          stable_code: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_status"]
        }
        Update: {
          archived_at?: string | null
          availability?: Database["public"]["Enums"]["availability_status"]
          bestseller?: boolean
          created_at?: string
          featured?: boolean
          id?: string
          product_type?: Database["public"]["Enums"]["product_type"]
          published_at?: string | null
          same_day_eligible?: boolean
          slug?: string
          sort_order?: number
          stable_code?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_status"]
        }
        Relationships: []
      }
      tone_translations: {
        Row: {
          created_at: string
          description: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          name: string
          tone_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          name: string
          tone_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          locale?: Database["public"]["Enums"]["locale_code"]
          name?: string
          tone_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tone_translations_tone_id_fkey"
            columns: ["tone_id"]
            isOneToOne: false
            referencedRelation: "tones"
            referencedColumns: ["id"]
          },
        ]
      }
      tones: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          published_at: string | null
          sort_order: number
          stable_code: string
          swatch_value: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_status"]
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          sort_order?: number
          stable_code: string
          swatch_value?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_status"]
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          sort_order?: number
          stable_code?: string
          swatch_value?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_status"]
        }
        Relationships: []
      }
      wrapping_option_translations: {
        Row: {
          created_at: string
          description: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          name: string
          updated_at: string
          wrapping_option_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          name: string
          updated_at?: string
          wrapping_option_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          locale?: Database["public"]["Enums"]["locale_code"]
          name?: string
          updated_at?: string
          wrapping_option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wrapping_option_translations_wrapping_option_id_fkey"
            columns: ["wrapping_option_id"]
            isOneToOne: false
            referencedRelation: "wrapping_options"
            referencedColumns: ["id"]
          },
        ]
      }
      wrapping_option_variants: {
        Row: {
          active: boolean
          created_at: string
          price_modifier_amount: number | null
          sort_order: number
          updated_at: string
          wrapping_option_id: string
          wrapping_variant_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          price_modifier_amount?: number | null
          sort_order?: number
          updated_at?: string
          wrapping_option_id: string
          wrapping_variant_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          price_modifier_amount?: number | null
          sort_order?: number
          updated_at?: string
          wrapping_option_id?: string
          wrapping_variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wrapping_option_variants_wrapping_option_id_fkey"
            columns: ["wrapping_option_id"]
            isOneToOne: false
            referencedRelation: "wrapping_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wrapping_option_variants_wrapping_variant_id_fkey"
            columns: ["wrapping_variant_id"]
            isOneToOne: false
            referencedRelation: "wrapping_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      wrapping_options: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          media_asset_id: string | null
          price_modifier_amount: number
          published_at: string | null
          sort_order: number
          stable_code: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_status"]
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          media_asset_id?: string | null
          price_modifier_amount?: number
          published_at?: string | null
          sort_order?: number
          stable_code: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_status"]
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          media_asset_id?: string | null
          price_modifier_amount?: number
          published_at?: string | null
          sort_order?: number
          stable_code?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_status"]
        }
        Relationships: [
          {
            foreignKeyName: "wrapping_options_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      wrapping_variant_translations: {
        Row: {
          created_at: string
          description: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          name: string
          updated_at: string
          wrapping_variant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          name: string
          updated_at?: string
          wrapping_variant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          locale?: Database["public"]["Enums"]["locale_code"]
          name?: string
          updated_at?: string
          wrapping_variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wrapping_variant_translations_wrapping_variant_id_fkey"
            columns: ["wrapping_variant_id"]
            isOneToOne: false
            referencedRelation: "wrapping_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      wrapping_variants: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          media_asset_id: string | null
          price_modifier_amount: number
          published_at: string | null
          sort_order: number
          stable_code: string
          swatch_value: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_status"]
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          media_asset_id?: string | null
          price_modifier_amount?: number
          published_at?: string | null
          sort_order?: number
          stable_code: string
          swatch_value: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_status"]
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          media_asset_id?: string | null
          price_modifier_amount?: number
          published_at?: string | null
          sort_order?: number
          stable_code?: string
          swatch_value?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_status"]
        }
        Relationships: [
          {
            foreignKeyName: "wrapping_variants_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_admin_profile_id: { Args: never; Returns: string }
      flower_stem_publication_issues: {
        Args: { target_flower_stem_id: string }
        Returns: string[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_catalog_manager: { Args: never; Returns: boolean }
      product_publication_issues: {
        Args: { target_product_id: string }
        Returns: string[]
      }
      set_product_primary_image: {
        Args: { target_image_id: string; target_product_id: string }
        Returns: undefined
      }
      wrapping_option_publication_issues: {
        Args: { target_wrapping_option_id: string }
        Returns: string[]
      }
      wrapping_variant_publication_issues: {
        Args: { target_wrapping_variant_id: string }
        Returns: string[]
      }
    }
    Enums: {
      admin_role: "ADMIN" | "STAFF"
      availability_status: "AVAILABLE" | "UNAVAILABLE" | "SEASONAL"
      locale_code: "vi" | "ko"
      media_access: "PUBLIC" | "PRIVATE"
      media_status: "ACTIVE" | "ARCHIVED"
      product_image_role: "PRIMARY" | "GALLERY"
      product_type: "READY_MADE_BOUQUET" | "FLORIST_CHOICE" | "CUSTOM_BOUQUET"
      visibility_status: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED"
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
      admin_role: ["ADMIN", "STAFF"],
      availability_status: ["AVAILABLE", "UNAVAILABLE", "SEASONAL"],
      locale_code: ["vi", "ko"],
      media_access: ["PUBLIC", "PRIVATE"],
      media_status: ["ACTIVE", "ARCHIVED"],
      product_image_role: ["PRIMARY", "GALLERY"],
      product_type: ["READY_MADE_BOUQUET", "FLORIST_CHOICE", "CUSTOM_BOUQUET"],
      visibility_status: ["DRAFT", "PUBLISHED", "HIDDEN", "ARCHIVED"],
    },
  },
} as const
