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
      budget_range_translations: {
        Row: {
          budget_range_id: string
          created_at: string
          description: string | null
          label: string
          locale: Database["public"]["Enums"]["locale_code"]
          scale_label: string | null
          updated_at: string
        }
        Insert: {
          budget_range_id: string
          created_at?: string
          description?: string | null
          label: string
          locale: Database["public"]["Enums"]["locale_code"]
          scale_label?: string | null
          updated_at?: string
        }
        Update: {
          budget_range_id?: string
          created_at?: string
          description?: string | null
          label?: string
          locale?: Database["public"]["Enums"]["locale_code"]
          scale_label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_range_translations_budget_range_id_fkey"
            columns: ["budget_range_id"]
            isOneToOne: false
            referencedRelation: "budget_ranges"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_ranges: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          max_amount: number | null
          min_amount: number
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
          max_amount?: number | null
          min_amount?: number
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
          max_amount?: number | null
          min_amount?: number
          published_at?: string | null
          sort_order?: number
          stable_code?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_status"]
        }
        Relationships: []
      }
      categories: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
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
          published_at?: string | null
          slug?: string
          sort_order?: number
          stable_code?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_status"]
        }
        Relationships: []
      }
      category_translations: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          locale?: Database["public"]["Enums"]["locale_code"]
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_throttle_buckets: {
        Row: {
          attempt_count: number
          expires_at: string
          idempotency_keys: string[]
          identifier_hash: string
          request_count: number
          updated_at: string
          window_started_at: string
        }
        Insert: {
          attempt_count: number
          expires_at: string
          idempotency_keys?: string[]
          identifier_hash: string
          request_count: number
          updated_at?: string
          window_started_at: string
        }
        Update: {
          attempt_count?: number
          expires_at?: string
          idempotency_keys?: string[]
          identifier_hash?: string
          request_count?: number
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          created_at: string
          delivery_notes: string | null
          id: string
          order_id: string
          requested_date: string
          requested_window: string | null
          source_delivery_window_id: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
          window_label_snapshot: string | null
        }
        Insert: {
          created_at?: string
          delivery_notes?: string | null
          id?: string
          order_id: string
          requested_date: string
          requested_window?: string | null
          source_delivery_window_id?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
          window_label_snapshot?: string | null
        }
        Update: {
          created_at?: string
          delivery_notes?: string | null
          id?: string
          order_id?: string
          requested_date?: string
          requested_window?: string | null
          source_delivery_window_id?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
          window_label_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_source_delivery_window_id_fkey"
            columns: ["source_delivery_window_id"]
            isOneToOne: false
            referencedRelation: "delivery_windows"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_settings: {
        Row: {
          delivery_enabled: boolean
          delivery_help_ko: string | null
          delivery_help_vi: string | null
          pickup_address_ko: string | null
          pickup_address_vi: string | null
          pickup_enabled: boolean
          pickup_hours_ko: string | null
          pickup_hours_vi: string | null
          pickup_name_ko: string | null
          pickup_name_vi: string | null
          same_day_cutoff: string | null
          same_day_enabled: boolean
          singleton: boolean
          updated_at: string
        }
        Insert: {
          delivery_enabled?: boolean
          delivery_help_ko?: string | null
          delivery_help_vi?: string | null
          pickup_address_ko?: string | null
          pickup_address_vi?: string | null
          pickup_enabled?: boolean
          pickup_hours_ko?: string | null
          pickup_hours_vi?: string | null
          pickup_name_ko?: string | null
          pickup_name_vi?: string | null
          same_day_cutoff?: string | null
          same_day_enabled?: boolean
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          delivery_enabled?: boolean
          delivery_help_ko?: string | null
          delivery_help_vi?: string | null
          pickup_address_ko?: string | null
          pickup_address_vi?: string | null
          pickup_enabled?: boolean
          pickup_hours_ko?: string | null
          pickup_hours_vi?: string | null
          pickup_name_ko?: string | null
          pickup_name_vi?: string | null
          same_day_cutoff?: string | null
          same_day_enabled?: boolean
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      delivery_status_events: {
        Row: {
          actor_admin_id: string | null
          created_at: string
          delivery_id: string
          from_status: Database["public"]["Enums"]["delivery_status"] | null
          id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["delivery_status"]
        }
        Insert: {
          actor_admin_id?: string | null
          created_at?: string
          delivery_id: string
          from_status?: Database["public"]["Enums"]["delivery_status"] | null
          id?: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["delivery_status"]
        }
        Update: {
          actor_admin_id?: string | null
          created_at?: string
          delivery_id?: string
          from_status?: Database["public"]["Enums"]["delivery_status"] | null
          id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["delivery_status"]
        }
        Relationships: [
          {
            foreignKeyName: "delivery_status_events_actor_admin_id_fkey"
            columns: ["actor_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_status_events_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_windows: {
        Row: {
          active: boolean
          created_at: string
          end_time: string
          help_ko: string | null
          help_vi: string | null
          id: string
          label_ko: string
          label_vi: string
          same_day_eligible: boolean
          sort_order: number
          stable_code: string
          start_time: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          end_time: string
          help_ko?: string | null
          help_vi?: string | null
          id?: string
          label_ko: string
          label_vi: string
          same_day_eligible?: boolean
          sort_order?: number
          stable_code: string
          start_time: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          end_time?: string
          help_ko?: string | null
          help_vi?: string | null
          id?: string
          label_ko?: string
          label_vi?: string
          same_day_eligible?: boolean
          sort_order?: number
          stable_code?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_zone_areas: {
        Row: {
          active: boolean
          created_at: string
          delivery_zone_id: string
          id: string
          name_ko: string
          name_vi: string
          sort_order: number
          stable_code: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          delivery_zone_id: string
          id?: string
          name_ko: string
          name_vi: string
          sort_order?: number
          stable_code: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          delivery_zone_id?: string
          id?: string
          name_ko?: string
          name_vi?: string
          sort_order?: number
          stable_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zone_areas_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zone_translations: {
        Row: {
          delivery_zone_id: string
          help_text: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          name: string
        }
        Insert: {
          delivery_zone_id: string
          help_text?: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          name: string
        }
        Update: {
          delivery_zone_id?: string
          help_text?: string | null
          locale?: Database["public"]["Enums"]["locale_code"]
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zone_translations_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          active: boolean
          created_at: string
          fee_amount: number
          id: string
          same_day_eligible: boolean
          sort_order: number
          stable_code: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          fee_amount: number
          id?: string
          same_day_eligible?: boolean
          sort_order?: number
          stable_code: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          fee_amount?: number
          id?: string
          same_day_eligible?: boolean
          sort_order?: number
          stable_code?: string
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
      homepage_feature_item_translations: {
        Row: {
          body: string | null
          created_at: string
          homepage_feature_item_id: string
          label: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          homepage_feature_item_id: string
          label?: string | null
          locale: Database["public"]["Enums"]["locale_code"]
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          homepage_feature_item_id?: string
          label?: string | null
          locale?: Database["public"]["Enums"]["locale_code"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_feature_item_translation_homepage_feature_item_id_fkey"
            columns: ["homepage_feature_item_id"]
            isOneToOne: false
            referencedRelation: "homepage_feature_items"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_feature_items: {
        Row: {
          active: boolean
          created_at: string
          homepage_section_id: string
          id: string
          item_key: string
          media_asset_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          homepage_section_id: string
          id?: string
          item_key: string
          media_asset_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          homepage_section_id?: string
          id?: string
          item_key?: string
          media_asset_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_feature_items_homepage_section_id_fkey"
            columns: ["homepage_section_id"]
            isOneToOne: false
            referencedRelation: "homepage_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_feature_items_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_product_curations: {
        Row: {
          active: boolean
          created_at: string
          homepage_section_id: string
          product_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          homepage_section_id: string
          product_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          homepage_section_id?: string
          product_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_product_curations_homepage_section_id_fkey"
            columns: ["homepage_section_id"]
            isOneToOne: false
            referencedRelation: "homepage_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_product_curations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_section_media: {
        Row: {
          active: boolean
          created_at: string
          homepage_section_id: string
          id: string
          media_asset_id: string
          slot_key: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          homepage_section_id: string
          id?: string
          media_asset_id: string
          slot_key: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          homepage_section_id?: string
          id?: string
          media_asset_id?: string
          slot_key?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_section_media_homepage_section_id_fkey"
            columns: ["homepage_section_id"]
            isOneToOne: false
            referencedRelation: "homepage_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_section_media_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_section_translations: {
        Row: {
          body: string | null
          created_at: string
          detail_one_label: string | null
          detail_one_value: string | null
          detail_two_label: string | null
          detail_two_value: string | null
          eyebrow: string | null
          homepage_section_id: string
          locale: Database["public"]["Enums"]["locale_code"]
          note: string | null
          primary_cta_label: string | null
          secondary_body: string | null
          secondary_cta_label: string | null
          secondary_heading: string | null
          title_line_one: string
          title_line_two: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          detail_one_label?: string | null
          detail_one_value?: string | null
          detail_two_label?: string | null
          detail_two_value?: string | null
          eyebrow?: string | null
          homepage_section_id: string
          locale: Database["public"]["Enums"]["locale_code"]
          note?: string | null
          primary_cta_label?: string | null
          secondary_body?: string | null
          secondary_cta_label?: string | null
          secondary_heading?: string | null
          title_line_one: string
          title_line_two?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          detail_one_label?: string | null
          detail_one_value?: string | null
          detail_two_label?: string | null
          detail_two_value?: string | null
          eyebrow?: string | null
          homepage_section_id?: string
          locale?: Database["public"]["Enums"]["locale_code"]
          note?: string | null
          primary_cta_label?: string | null
          secondary_body?: string | null
          secondary_cta_label?: string | null
          secondary_heading?: string | null
          title_line_one?: string
          title_line_two?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_section_translations_homepage_section_id_fkey"
            columns: ["homepage_section_id"]
            isOneToOne: false
            referencedRelation: "homepage_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_sections: {
        Row: {
          created_at: string
          display_order: number
          enabled: boolean
          id: string
          primary_cta_target: string | null
          secondary_cta_target: string | null
          section_key: string
          updated_at: string
          visit_google_maps_url: string | null
          visit_map_enabled: boolean
          visit_map_query: string | null
        }
        Insert: {
          created_at?: string
          display_order: number
          enabled?: boolean
          id?: string
          primary_cta_target?: string | null
          secondary_cta_target?: string | null
          section_key: string
          updated_at?: string
          visit_google_maps_url?: string | null
          visit_map_enabled?: boolean
          visit_map_query?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          enabled?: boolean
          id?: string
          primary_cta_target?: string | null
          secondary_cta_target?: string | null
          section_key?: string
          updated_at?: string
          visit_google_maps_url?: string | null
          visit_map_enabled?: boolean
          visit_map_query?: string | null
        }
        Relationships: []
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
      navigation_item_translations: {
        Row: {
          created_at: string
          label: string
          locale: Database["public"]["Enums"]["locale_code"]
          navigation_item_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          label: string
          locale: Database["public"]["Enums"]["locale_code"]
          navigation_item_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          label?: string
          locale?: Database["public"]["Enums"]["locale_code"]
          navigation_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "navigation_item_translations_navigation_item_id_fkey"
            columns: ["navigation_item_id"]
            isOneToOne: false
            referencedRelation: "navigation_items"
            referencedColumns: ["id"]
          },
        ]
      }
      navigation_items: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          destination_type: Database["public"]["Enums"]["navigation_destination_type"]
          external_url: string | null
          id: string
          sort_order: number
          stable_code: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          destination_type: Database["public"]["Enums"]["navigation_destination_type"]
          external_url?: string | null
          id?: string
          sort_order?: number
          stable_code: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          destination_type?: Database["public"]["Enums"]["navigation_destination_type"]
          external_url?: string | null
          id?: string
          sort_order?: number
          stable_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "navigation_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
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
      order_addresses: {
        Row: {
          address_text: string
          area_name_snapshot: string | null
          created_at: string
          id: string
          order_id: string
          source_delivery_area_id: string | null
          zone_name_snapshot: string | null
        }
        Insert: {
          address_text: string
          area_name_snapshot?: string | null
          created_at?: string
          id?: string
          order_id: string
          source_delivery_area_id?: string | null
          zone_name_snapshot?: string | null
        }
        Update: {
          address_text?: string
          area_name_snapshot?: string | null
          created_at?: string
          id?: string
          order_id?: string
          source_delivery_area_id?: string | null
          zone_name_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_addresses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_addresses_source_delivery_area_id_fkey"
            columns: ["source_delivery_area_id"]
            isOneToOne: false
            referencedRelation: "delivery_zone_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          configuration_summary_snapshot: Json | null
          created_at: string
          id: string
          item_type: Database["public"]["Enums"]["order_item_type"]
          line_total: number
          order_id: string
          primary_media_path_snapshot: string | null
          product_code_snapshot: string | null
          product_name_snapshot: string
          product_slug_snapshot: string | null
          quantity: number
          sku_snapshot: string | null
          source_product_id: string | null
          source_tone_id: string | null
          source_variant_id: string | null
          source_wrapping_option_id: string | null
          source_wrapping_variant_id: string | null
          tone_code_snapshot: string | null
          tone_name_snapshot: string | null
          unit_price_snapshot: number
          variant_code_snapshot: string | null
          variant_name_snapshot: string | null
        }
        Insert: {
          configuration_summary_snapshot?: Json | null
          created_at?: string
          id?: string
          item_type: Database["public"]["Enums"]["order_item_type"]
          line_total: number
          order_id: string
          primary_media_path_snapshot?: string | null
          product_code_snapshot?: string | null
          product_name_snapshot: string
          product_slug_snapshot?: string | null
          quantity: number
          sku_snapshot?: string | null
          source_product_id?: string | null
          source_tone_id?: string | null
          source_variant_id?: string | null
          source_wrapping_option_id?: string | null
          source_wrapping_variant_id?: string | null
          tone_code_snapshot?: string | null
          tone_name_snapshot?: string | null
          unit_price_snapshot: number
          variant_code_snapshot?: string | null
          variant_name_snapshot?: string | null
        }
        Update: {
          configuration_summary_snapshot?: Json | null
          created_at?: string
          id?: string
          item_type?: Database["public"]["Enums"]["order_item_type"]
          line_total?: number
          order_id?: string
          primary_media_path_snapshot?: string | null
          product_code_snapshot?: string | null
          product_name_snapshot?: string
          product_slug_snapshot?: string | null
          quantity?: number
          sku_snapshot?: string | null
          source_product_id?: string | null
          source_tone_id?: string | null
          source_variant_id?: string | null
          source_wrapping_option_id?: string | null
          source_wrapping_variant_id?: string | null
          tone_code_snapshot?: string | null
          tone_name_snapshot?: string | null
          unit_price_snapshot?: number
          variant_code_snapshot?: string | null
          variant_name_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_source_tone_id_fkey"
            columns: ["source_tone_id"]
            isOneToOne: false
            referencedRelation: "tones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_source_variant_id_fkey"
            columns: ["source_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_source_wrapping_option_id_fkey"
            columns: ["source_wrapping_option_id"]
            isOneToOne: false
            referencedRelation: "wrapping_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_source_wrapping_variant_id_fkey"
            columns: ["source_wrapping_variant_id"]
            isOneToOne: false
            referencedRelation: "wrapping_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_recipients: {
        Row: {
          created_at: string
          id: string
          name: string
          order_id: string
          phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_id: string
          phone: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_id?: string
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_recipients_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_events: {
        Row: {
          actor_admin_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          order_id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_admin_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          order_id: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_admin_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          order_id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_events_actor_admin_id_fkey"
            columns: ["actor_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_email: string | null
          buyer_is_recipient: boolean
          buyer_name: string
          buyer_phone: string
          card_message: string | null
          commerce_request_fingerprint: string | null
          created_at: string
          currency: string
          delivery_area_code_snapshot: string | null
          delivery_area_id: string | null
          delivery_area_name_snapshot: string | null
          delivery_fee_amount: number | null
          delivery_window_id: string | null
          delivery_window_label_snapshot: string | null
          delivery_zone_code_snapshot: string | null
          delivery_zone_id: string | null
          delivery_zone_name_snapshot: string | null
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          id: string
          idempotency_key_hash: string
          is_surprise: boolean
          locale: Database["public"]["Enums"]["locale_code"]
          order_number: string
          pickup_address_snapshot: string | null
          pickup_hours_snapshot: string | null
          pickup_name_snapshot: string | null
          placed_at: string
          request_fingerprint: string
          requested_fulfillment_date: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_amount: number
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          buyer_email?: string | null
          buyer_is_recipient: boolean
          buyer_name: string
          buyer_phone: string
          card_message?: string | null
          commerce_request_fingerprint?: string | null
          created_at?: string
          currency?: string
          delivery_area_code_snapshot?: string | null
          delivery_area_id?: string | null
          delivery_area_name_snapshot?: string | null
          delivery_fee_amount?: number | null
          delivery_window_id?: string | null
          delivery_window_label_snapshot?: string | null
          delivery_zone_code_snapshot?: string | null
          delivery_zone_id?: string | null
          delivery_zone_name_snapshot?: string | null
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          idempotency_key_hash: string
          is_surprise?: boolean
          locale: Database["public"]["Enums"]["locale_code"]
          order_number: string
          pickup_address_snapshot?: string | null
          pickup_hours_snapshot?: string | null
          pickup_name_snapshot?: string | null
          placed_at?: string
          request_fingerprint: string
          requested_fulfillment_date?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_amount: number
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          buyer_email?: string | null
          buyer_is_recipient?: boolean
          buyer_name?: string
          buyer_phone?: string
          card_message?: string | null
          commerce_request_fingerprint?: string | null
          created_at?: string
          currency?: string
          delivery_area_code_snapshot?: string | null
          delivery_area_id?: string | null
          delivery_area_name_snapshot?: string | null
          delivery_fee_amount?: number | null
          delivery_window_id?: string | null
          delivery_window_label_snapshot?: string | null
          delivery_zone_code_snapshot?: string | null
          delivery_zone_id?: string | null
          delivery_zone_name_snapshot?: string | null
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          idempotency_key_hash?: string
          is_surprise?: boolean
          locale?: Database["public"]["Enums"]["locale_code"]
          order_number?: string
          pickup_address_snapshot?: string | null
          pickup_hours_snapshot?: string | null
          pickup_name_snapshot?: string | null
          placed_at?: string
          request_fingerprint?: string
          requested_fulfillment_date?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_amount?: number
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_delivery_area_id_fkey"
            columns: ["delivery_area_id"]
            isOneToOne: false
            referencedRelation: "delivery_zone_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_window_id_fkey"
            columns: ["delivery_window_id"]
            isOneToOne: false
            referencedRelation: "delivery_windows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          account_holder: string | null
          account_number: string | null
          bank_id: string | null
          bank_instructions_ko: string | null
          bank_instructions_vi: string | null
          bank_name: string | null
          bank_transfer_enabled: boolean
          cash_delivery_enabled: boolean
          cash_enabled: boolean
          cash_instructions_ko: string | null
          cash_instructions_vi: string | null
          cash_pickup_enabled: boolean
          payment_deadline_hours: number | null
          singleton: boolean
          transfer_reference_template: string | null
          updated_at: string
          vietqr_template: string | null
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          bank_id?: string | null
          bank_instructions_ko?: string | null
          bank_instructions_vi?: string | null
          bank_name?: string | null
          bank_transfer_enabled?: boolean
          cash_delivery_enabled?: boolean
          cash_enabled?: boolean
          cash_instructions_ko?: string | null
          cash_instructions_vi?: string | null
          cash_pickup_enabled?: boolean
          payment_deadline_hours?: number | null
          singleton?: boolean
          transfer_reference_template?: string | null
          updated_at?: string
          vietqr_template?: string | null
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          bank_id?: string | null
          bank_instructions_ko?: string | null
          bank_instructions_vi?: string | null
          bank_name?: string | null
          bank_transfer_enabled?: boolean
          cash_delivery_enabled?: boolean
          cash_enabled?: boolean
          cash_instructions_ko?: string | null
          cash_instructions_vi?: string | null
          cash_pickup_enabled?: boolean
          payment_deadline_hours?: number | null
          singleton?: boolean
          transfer_reference_template?: string | null
          updated_at?: string
          vietqr_template?: string | null
        }
        Relationships: []
      }
      payment_status_events: {
        Row: {
          actor_admin_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["payment_status"] | null
          id: string
          payment_id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          actor_admin_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["payment_status"] | null
          id?: string
          payment_id: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          actor_admin_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["payment_status"] | null
          id?: string
          payment_id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_status_events_actor_admin_id_fkey"
            columns: ["actor_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_status_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          account_holder_snapshot: string | null
          account_number_snapshot: string | null
          amount: number | null
          bank_id_snapshot: string | null
          bank_name_snapshot: string | null
          created_at: string
          currency: string
          id: string
          instruction_snapshot: string | null
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          paid_at: string | null
          payment_deadline_at: string | null
          payment_reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          vietqr_template_snapshot: string | null
        }
        Insert: {
          account_holder_snapshot?: string | null
          account_number_snapshot?: string | null
          amount?: number | null
          bank_id_snapshot?: string | null
          bank_name_snapshot?: string | null
          created_at?: string
          currency?: string
          id?: string
          instruction_snapshot?: string | null
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          paid_at?: string | null
          payment_deadline_at?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          vietqr_template_snapshot?: string | null
        }
        Update: {
          account_holder_snapshot?: string | null
          account_number_snapshot?: string | null
          amount?: number | null
          bank_id_snapshot?: string | null
          bank_name_snapshot?: string | null
          created_at?: string
          currency?: string
          id?: string
          instruction_snapshot?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          paid_at?: string | null
          payment_deadline_at?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          vietqr_template_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
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
          sku: string
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
          sku: string
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
          sku?: string
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
          category_id: string
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
          category_id: string
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
          category_id?: string
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
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      site_profile: {
        Row: {
          business_name: string
          email: string | null
          instagram_handle: string | null
          instagram_url: string | null
          phone: string | null
          singleton: boolean
          updated_at: string
        }
        Insert: {
          business_name: string
          email?: string | null
          instagram_handle?: string | null
          instagram_url?: string | null
          phone?: string | null
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          business_name?: string
          email?: string | null
          instagram_handle?: string | null
          instagram_url?: string | null
          phone?: string | null
          singleton?: boolean
          updated_at?: string
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
      admin_save_product_atomic: {
        Args: { product_payload: Json }
        Returns: string
      }
      admin_archive_category: {
        Args: { target_id: string }
        Returns: undefined
      }
      admin_delete_navigation_item: {
        Args: { target_id: string }
        Returns: undefined
      }
      admin_reorder_categories: {
        Args: { target_ids: string[] }
        Returns: undefined
      }
      admin_reorder_navigation: {
        Args: { target_ids: string[] }
        Returns: undefined
      }
      admin_save_category: {
        Args: {
          target_active: boolean
          target_description_ko?: string
          target_description_vi?: string
          target_id: string | null
          target_name_ko: string
          target_name_vi: string
          target_slug: string
          target_sort_order: number
          target_stable_code: string
        }
        Returns: string
      }
      admin_save_navigation_item: {
        Args: {
          target_active: boolean
          target_category_id: string | null
          target_destination_type: Database["public"]["Enums"]["navigation_destination_type"]
          target_external_url: string | null
          target_id: string | null
          target_label_ko: string
          target_label_vi: string
          target_sort_order: number
          target_stable_code: string
        }
        Returns: string
      }
      admin_list_orders: {
        Args: {
          delivery_date_from?: string
          delivery_date_to?: string
          page_offset?: number
          page_size?: number
          payment_status_filter?: Database["public"]["Enums"]["payment_status"]
          search_query?: string
          status_filter?: Database["public"]["Enums"]["order_status"]
        }
        Returns: {
          buyer_name: string
          buyer_phone: string
          item_count: number
          item_summary: string
          order_id: string
          order_number: string
          order_status: Database["public"]["Enums"]["order_status"]
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          placed_at: string
          recipient_name: string
          recipient_phone: string
          requested_date: string
          subtotal_amount: number
          total_count: number
        }[]
      }
      admin_mark_payment_paid: {
        Args: {
          expected_status: Database["public"]["Enums"]["payment_status"]
          target_payment_id: string
          transition_reason?: string
        }
        Returns: {
          event_id: string
          paid_at: string
          payment_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          previous_status: Database["public"]["Enums"]["payment_status"]
        }[]
      }
      admin_save_delivery_settings: {
        Args: {
          expected_updated_at: string
          next_delivery_enabled: boolean
          next_delivery_help_ko: string
          next_delivery_help_vi: string
          next_pickup_address_ko: string
          next_pickup_address_vi: string
          next_pickup_enabled: boolean
          next_pickup_hours_ko: string
          next_pickup_hours_vi: string
          next_pickup_name_ko: string
          next_pickup_name_vi: string
          next_same_day_cutoff: string
          next_same_day_enabled: boolean
        }
        Returns: string
      }
      admin_save_delivery_window: {
        Args: {
          expected_updated_at: string
          target_window_id: string
          window_active: boolean
          window_end_time: string
          window_help_ko: string
          window_help_vi: string
          window_label_ko: string
          window_label_vi: string
          window_same_day_eligible: boolean
          window_sort_order: number
          window_stable_code: string
          window_start_time: string
        }
        Returns: string
      }
      admin_save_delivery_zone: {
        Args: {
          target_zone_id: string
          zone_active: boolean
          zone_areas: Json
          zone_fee_amount: number
          zone_help_ko: string
          zone_help_vi: string
          zone_name_ko: string
          zone_name_vi: string
          zone_same_day_eligible: boolean
          zone_sort_order: number
          zone_stable_code: string
        }
        Returns: string
      }
      admin_save_delivery_zone_v15: {
        Args: {
          expected_updated_at: string
          target_zone_id: string
          zone_active: boolean
          zone_areas: Json
          zone_fee_amount: number
          zone_help_ko: string
          zone_help_vi: string
          zone_name_ko: string
          zone_name_vi: string
          zone_same_day_eligible: boolean
          zone_sort_order: number
          zone_stable_code: string
        }
        Returns: string
      }
      admin_save_payment_settings: {
        Args: {
          expected_updated_at: string
          next_account_holder: string
          next_account_number: string
          next_bank_id: string
          next_bank_instructions_ko: string
          next_bank_instructions_vi: string
          next_bank_name: string
          next_bank_transfer_enabled: boolean
          next_cash_delivery_enabled: boolean
          next_cash_enabled: boolean
          next_cash_instructions_ko: string
          next_cash_instructions_vi: string
          next_cash_pickup_enabled: boolean
          next_payment_deadline_hours: number
          next_transfer_reference_template: string
          next_vietqr_template: string
        }
        Returns: string
      }
      admin_transition_delivery_status: {
        Args: {
          expected_status: Database["public"]["Enums"]["delivery_status"]
          next_status: Database["public"]["Enums"]["delivery_status"]
          target_delivery_id: string
          transition_reason?: string
        }
        Returns: {
          changed_at: string
          delivery_id: string
          delivery_status: Database["public"]["Enums"]["delivery_status"]
          event_id: string
          previous_status: Database["public"]["Enums"]["delivery_status"]
        }[]
      }
      admin_transition_order_status: {
        Args: {
          expected_status: Database["public"]["Enums"]["order_status"]
          next_status: Database["public"]["Enums"]["order_status"]
          target_order_id: string
          transition_reason?: string
        }
        Returns: {
          changed_at: string
          event_id: string
          order_id: string
          order_number: string
          order_status: Database["public"]["Enums"]["order_status"]
          previous_status: Database["public"]["Enums"]["order_status"]
        }[]
      }
      assert_delivery_configuration: { Args: never; Returns: undefined }
      consume_checkout_throttle: {
        Args: {
          request_idempotency_key: string
          request_identifier_hash: string
        }
        Returns: {
          allowed: boolean
          attempt_count: number
          idempotent_retry: boolean
          retry_after_seconds: number
        }[]
      }
      create_checkout_order: {
        Args: {
          checkout_idempotency_key: string
          checkout_payload: Json
          reviewed_subtotal: number
        }
        Returns: {
          account_holder: string
          account_number: string
          bank_id: string
          bank_name: string
          delivery_area_name: string
          delivery_fee_amount: number
          delivery_window_label: string
          fulfillment_name: string
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          order_id: string
          order_number: string
          order_status: Database["public"]["Enums"]["order_status"]
          payment_deadline_at: string
          payment_instruction: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_reference: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          placed_at: string
          subtotal_amount: number
          total_amount: number
          vietqr_template: string
          was_duplicate: boolean
        }[]
      }
      create_checkout_order_v12_internal: {
        Args: {
          checkout_idempotency_key: string
          checkout_payload: Json
          reviewed_subtotal: number
        }
        Returns: {
          delivery_fee_amount: number
          order_id: string
          order_number: string
          order_status: Database["public"]["Enums"]["order_status"]
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          placed_at: string
          subtotal_amount: number
          total_amount: number
          was_duplicate: boolean
        }[]
      }
      current_admin_profile_id: { Args: never; Returns: string }
      flower_stem_publication_issues: {
        Args: { target_flower_stem_id: string }
        Returns: string[]
      }
      get_checkout_options: {
        Args: { requested_locale: Database["public"]["Enums"]["locale_code"] }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      is_catalog_manager: { Args: never; Returns: boolean }
      product_publication_issues: {
        Args: { target_product_id: string }
        Returns: string[]
      }
      reorder_homepage_section_media: {
        Args: { target_media_ids: string[]; target_section_id: string }
        Returns: undefined
      }
      replace_homepage_product_curations: {
        Args: { target_product_ids: string[]; target_section_id: string }
        Returns: undefined
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
      delivery_status:
        | "PENDING"
        | "SCHEDULED"
        | "READY_FOR_DISPATCH"
        | "OUT_FOR_DELIVERY"
        | "DELIVERED"
        | "FAILED"
        | "CANCELLED"
      fulfillment_type: "DELIVERY" | "PICKUP"
      locale_code: "vi" | "ko"
      media_access: "PUBLIC" | "PRIVATE"
      media_status: "ACTIVE" | "ARCHIVED"
      navigation_destination_type:
        | "HOME"
        | "CATALOG"
        | "CATEGORY"
        | "BUILDER"
        | "OCCASIONS"
        | "SAME_DAY"
        | "ABOUT"
        | "VISIT"
        | "EXTERNAL"
      order_item_type: "READY_MADE_PRODUCT" | "CUSTOM_BOUQUET"
      order_status:
        | "PENDING"
        | "CONFIRMED"
        | "PREPARING"
        | "READY"
        | "FULFILLING"
        | "COMPLETED"
        | "CANCELLED"
      payment_method: "BANK_TRANSFER" | "CASH"
      payment_status:
        | "UNPAID"
        | "PENDING"
        | "PAID"
        | "FAILED"
        | "REFUNDED"
        | "CANCELLED"
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
      delivery_status: [
        "PENDING",
        "SCHEDULED",
        "READY_FOR_DISPATCH",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "FAILED",
        "CANCELLED",
      ],
      fulfillment_type: ["DELIVERY", "PICKUP"],
      locale_code: ["vi", "ko"],
      media_access: ["PUBLIC", "PRIVATE"],
      media_status: ["ACTIVE", "ARCHIVED"],
      navigation_destination_type: [
        "HOME",
        "CATALOG",
        "CATEGORY",
        "BUILDER",
        "OCCASIONS",
        "SAME_DAY",
        "ABOUT",
        "VISIT",
        "EXTERNAL",
      ],
      order_item_type: ["READY_MADE_PRODUCT", "CUSTOM_BOUQUET"],
      order_status: [
        "PENDING",
        "CONFIRMED",
        "PREPARING",
        "READY",
        "FULFILLING",
        "COMPLETED",
        "CANCELLED",
      ],
      payment_method: ["BANK_TRANSFER", "CASH"],
      payment_status: [
        "UNPAID",
        "PENDING",
        "PAID",
        "FAILED",
        "REFUNDED",
        "CANCELLED",
      ],
      product_image_role: ["PRIMARY", "GALLERY"],
      product_type: ["READY_MADE_BOUQUET", "FLORIST_CHOICE", "CUSTOM_BOUQUET"],
      visibility_status: ["DRAFT", "PUBLISHED", "HIDDEN", "ARCHIVED"],
    },
  },
} as const
