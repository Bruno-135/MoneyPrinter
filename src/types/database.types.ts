/**
 * Tipos da base de dados.
 *
 * GERADO A PARTIR DO SCHEMA — não editar à mão.
 * Depois de uma migração nova, correr:
 *
 *     npm run db:types
 *
 * (equivalente a `supabase gen types typescript --linked > src/types/database.types.ts`)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string
          owner_id: string
          region_id: string | null
          google_place_id: string
          name: string
          business_category: string
          google_types: string[]
          is_food_service: boolean | null
          formatted_address: string | null
          street: string | null
          street_number: string | null
          postal_code: string | null
          locality: string | null
          admin_area: string | null
          country_code: string
          latitude: number | null
          longitude: number | null
          phone_raw: string | null
          phone_e164: string | null
          phone_country_code: string | null
          phone_country: string | null
          website_url: string | null
          has_website: boolean | null
          social_links: Json
          has_social: boolean | null
          rating: number | null
          reviews_count: number | null
          price_level: number | null
          business_status: string | null
          opening_hours: Json | null
          score: number
          score_breakdown: Json
          score_version: number
          score_calculated_at: string | null
          google_raw: Json
          google_fetched_at: string
          details_fetched_at: string | null
          is_archived: boolean
          internal_notes: string | null
          first_seen_at: string
          last_synced_at: string
          created_at: string
          updated_at: string
        };
        Insert: {
          id?: string
          owner_id?: string
          region_id?: string | null
          google_place_id: string
          name: string
          business_category: string
          google_types?: string[]
          is_food_service?: never
          formatted_address?: string | null
          street?: string | null
          street_number?: string | null
          postal_code?: string | null
          locality?: string | null
          admin_area?: string | null
          country_code: string
          latitude?: number | null
          longitude?: number | null
          phone_raw?: string | null
          phone_e164?: string | null
          phone_country_code?: string | null
          phone_country?: string | null
          website_url?: string | null
          has_website?: never
          social_links?: Json
          has_social?: never
          rating?: number | null
          reviews_count?: number | null
          price_level?: number | null
          business_status?: string | null
          opening_hours?: Json | null
          score?: number
          score_breakdown?: Json
          score_version?: number
          score_calculated_at?: string | null
          google_raw?: Json
          google_fetched_at?: string
          details_fetched_at?: string | null
          is_archived?: boolean
          internal_notes?: string | null
          first_seen_at?: string
          last_synced_at?: string
          created_at?: string
          updated_at?: string
        };
        Update: {
          id?: string
          owner_id?: string
          region_id?: string | null
          google_place_id?: string
          name?: string
          business_category?: string
          google_types?: string[]
          is_food_service?: never
          formatted_address?: string | null
          street?: string | null
          street_number?: string | null
          postal_code?: string | null
          locality?: string | null
          admin_area?: string | null
          country_code?: string
          latitude?: number | null
          longitude?: number | null
          phone_raw?: string | null
          phone_e164?: string | null
          phone_country_code?: string | null
          phone_country?: string | null
          website_url?: string | null
          has_website?: never
          social_links?: Json
          has_social?: never
          rating?: number | null
          reviews_count?: number | null
          price_level?: number | null
          business_status?: string | null
          opening_hours?: Json | null
          score?: number
          score_breakdown?: Json
          score_version?: number
          score_calculated_at?: string | null
          google_raw?: Json
          google_fetched_at?: string
          details_fetched_at?: string | null
          is_archived?: boolean
          internal_notes?: string | null
          first_seen_at?: string
          last_synced_at?: string
          created_at?: string
          updated_at?: string
        };
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "businesses_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "searched_regions";
            referencedColumns: ["id"];
          },
        ];
      };
      deal_stage_events: {
        Row: {
          id: string
          owner_id: string
          deal_id: string
          business_id: string
          from_stage: Database["public"]["Enums"]["deal_stage"] | null
          to_stage: Database["public"]["Enums"]["deal_stage"]
          changed_at: string
          changed_by: string | null
          note: string | null
          created_at: string
        };
        Insert: {
          id?: string
          owner_id?: string
          deal_id: string
          business_id: string
          from_stage?: Database["public"]["Enums"]["deal_stage"] | null
          to_stage: Database["public"]["Enums"]["deal_stage"]
          changed_at?: string
          changed_by?: string | null
          note?: string | null
          created_at?: string
        };
        Update: {
          id?: string
          owner_id?: string
          deal_id?: string
          business_id?: string
          from_stage?: Database["public"]["Enums"]["deal_stage"] | null
          to_stage?: Database["public"]["Enums"]["deal_stage"]
          changed_at?: string
          changed_by?: string | null
          note?: string | null
          created_at?: string
        };
        Relationships: [
          {
            foreignKeyName: "deal_stage_events_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deal_stage_events_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deal_stage_events_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deal_stage_events_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      deals: {
        Row: {
          id: string
          owner_id: string
          business_id: string
          stage: Database["public"]["Enums"]["deal_stage"]
          stage_changed_at: string
          expected_value_cents: number | null
          currency: string
          probability: number | null
          next_action: string | null
          next_action_at: string | null
          first_contacted_at: string | null
          last_contacted_at: string | null
          won_at: string | null
          lost_at: string | null
          lost_reason: string | null
          notes: string | null
          created_at: string
          updated_at: string
        };
        Insert: {
          id?: string
          owner_id?: string
          business_id: string
          stage?: Database["public"]["Enums"]["deal_stage"]
          stage_changed_at?: string
          expected_value_cents?: number | null
          currency?: string
          probability?: number | null
          next_action?: string | null
          next_action_at?: string | null
          first_contacted_at?: string | null
          last_contacted_at?: string | null
          won_at?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        };
        Update: {
          id?: string
          owner_id?: string
          business_id?: string
          stage?: Database["public"]["Enums"]["deal_stage"]
          stage_changed_at?: string
          expected_value_cents?: number | null
          currency?: string
          probability?: number | null
          next_action?: string | null
          next_action_at?: string | null
          first_contacted_at?: string | null
          last_contacted_at?: string | null
          won_at?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        };
        Relationships: [
          {
            foreignKeyName: "deals_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      generated_sites: {
        Row: {
          id: string
          owner_id: string
          business_id: string
          template: Database["public"]["Enums"]["site_template"]
          status: Database["public"]["Enums"]["site_status"]
          title: string | null
          content: Json
          theme: Json
          public_code: string
          published_at: string | null
          expires_at: string
          whatsapp_number_e164: string | null
          whatsapp_country: string | null
          whatsapp_greeting: string | null
          pdf_storage_path: string | null
          pdf_generated_at: string | null
          version: number
          created_at: string
          updated_at: string
        };
        Insert: {
          id?: string
          owner_id?: string
          business_id: string
          template?: Database["public"]["Enums"]["site_template"]
          status?: Database["public"]["Enums"]["site_status"]
          title?: string | null
          content?: Json
          theme?: Json
          public_code?: string
          published_at?: string | null
          expires_at?: string
          whatsapp_number_e164?: string | null
          whatsapp_country?: string | null
          whatsapp_greeting?: string | null
          pdf_storage_path?: string | null
          pdf_generated_at?: string | null
          version?: number
          created_at?: string
          updated_at?: string
        };
        Update: {
          id?: string
          owner_id?: string
          business_id?: string
          template?: Database["public"]["Enums"]["site_template"]
          status?: Database["public"]["Enums"]["site_status"]
          title?: string | null
          content?: Json
          theme?: Json
          public_code?: string
          published_at?: string | null
          expires_at?: string
          whatsapp_number_e164?: string | null
          whatsapp_country?: string | null
          whatsapp_greeting?: string | null
          pdf_storage_path?: string | null
          pdf_generated_at?: string | null
          version?: number
          created_at?: string
          updated_at?: string
        };
        Relationships: [
          {
            foreignKeyName: "generated_sites_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generated_sites_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_items: {
        Row: {
          id: string
          owner_id: string
          site_id: string
          section: string
          name: string
          description: string | null
          price_cents: number | null
          currency: string
          image_url: string | null
          allergens: string[]
          position: number
          is_available: boolean
          is_highlight: boolean
          created_at: string
          updated_at: string
        };
        Insert: {
          id?: string
          owner_id?: string
          site_id: string
          section?: string
          name: string
          description?: string | null
          price_cents?: number | null
          currency?: string
          image_url?: string | null
          allergens?: string[]
          position?: number
          is_available?: boolean
          is_highlight?: boolean
          created_at?: string
          updated_at?: string
        };
        Update: {
          id?: string
          owner_id?: string
          site_id?: string
          section?: string
          name?: string
          description?: string | null
          price_cents?: number | null
          currency?: string
          image_url?: string | null
          allergens?: string[]
          position?: number
          is_available?: boolean
          is_highlight?: boolean
          created_at?: string
          updated_at?: string
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_items_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "generated_sites";
            referencedColumns: ["id"];
          },
        ];
      };
      region_searches: {
        Row: {
          id: string
          owner_id: string
          region_id: string
          provider: string
          endpoint: string
          request_params: Json
          response_raw: Json
          http_status: number | null
          results_count: number
          page_token: string | null
          next_page_token: string | null
          error_message: string | null
          requested_at: string
          created_at: string
        };
        Insert: {
          id?: string
          owner_id?: string
          region_id: string
          provider?: string
          endpoint: string
          request_params?: Json
          response_raw?: Json
          http_status?: number | null
          results_count?: number
          page_token?: string | null
          next_page_token?: string | null
          error_message?: string | null
          requested_at?: string
          created_at?: string
        };
        Update: {
          id?: string
          owner_id?: string
          region_id?: string
          provider?: string
          endpoint?: string
          request_params?: Json
          response_raw?: Json
          http_status?: number | null
          results_count?: number
          page_token?: string | null
          next_page_token?: string | null
          error_message?: string | null
          requested_at?: string
          created_at?: string
        };
        Relationships: [
          {
            foreignKeyName: "region_searches_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "region_searches_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "searched_regions";
            referencedColumns: ["id"];
          },
        ];
      };
      searched_regions: {
        Row: {
          id: string
          owner_id: string
          label: string
          business_category: string
          country_code: string
          locality: string | null
          admin_area: string | null
          postal_code: string | null
          center_lat: number | null
          center_lng: number | null
          radius_meters: number | null
          search_query: string | null
          search_key: string | null
          first_searched_at: string
          last_searched_at: string
          search_count: number
          places_found: number
          new_places_last_search: number
          next_page_token: string | null
          is_exhausted: boolean
          notes: string | null
          created_at: string
          updated_at: string
        };
        Insert: {
          id?: string
          owner_id?: string
          label: string
          business_category: string
          country_code: string
          locality?: string | null
          admin_area?: string | null
          postal_code?: string | null
          center_lat?: number | null
          center_lng?: number | null
          radius_meters?: number | null
          search_query?: string | null
          search_key?: never
          first_searched_at?: string
          last_searched_at?: string
          search_count?: number
          places_found?: number
          new_places_last_search?: number
          next_page_token?: string | null
          is_exhausted?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        };
        Update: {
          id?: string
          owner_id?: string
          label?: string
          business_category?: string
          country_code?: string
          locality?: string | null
          admin_area?: string | null
          postal_code?: string | null
          center_lat?: number | null
          center_lng?: number | null
          radius_meters?: number | null
          search_query?: string | null
          search_key?: never
          first_searched_at?: string
          last_searched_at?: string
          search_count?: number
          places_found?: number
          new_places_last_search?: number
          next_page_token?: string | null
          is_exhausted?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        };
        Relationships: [
          {
            foreignKeyName: "searched_regions_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      site_clicks: {
        Row: {
          id: string
          owner_id: string
          site_id: string
          business_id: string | null
          menu_item_id: string | null
          visit_id: string | null
          target: Database["public"]["Enums"]["click_target"]
          target_value: string | null
          clicked_at: string
          session_id: string | null
          visitor_hash: string | null
          created_at: string
        };
        Insert: {
          id?: string
          owner_id: string
          site_id: string
          business_id?: string | null
          menu_item_id?: string | null
          visit_id?: string | null
          target: Database["public"]["Enums"]["click_target"]
          target_value?: string | null
          clicked_at?: string
          session_id?: string | null
          visitor_hash?: string | null
          created_at?: string
        };
        Update: {
          id?: string
          owner_id?: string
          site_id?: string
          business_id?: string | null
          menu_item_id?: string | null
          visit_id?: string | null
          target?: Database["public"]["Enums"]["click_target"]
          target_value?: string | null
          clicked_at?: string
          session_id?: string | null
          visitor_hash?: string | null
          created_at?: string
        };
        Relationships: [
          {
            foreignKeyName: "site_clicks_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_clicks_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_clicks_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_clicks_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "generated_sites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_clicks_visit_id_fkey";
            columns: ["visit_id"];
            isOneToOne: false;
            referencedRelation: "site_visits";
            referencedColumns: ["id"];
          },
        ];
      };
      site_visits: {
        Row: {
          id: string
          owner_id: string
          site_id: string
          business_id: string | null
          visited_at: string
          visitor_hash: string | null
          session_id: string | null
          is_first_visit: boolean
          referrer: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          device_type: string | null
          user_agent: string | null
          country_code: string | null
          city: string | null
          created_at: string
        };
        Insert: {
          id?: string
          owner_id: string
          site_id: string
          business_id?: string | null
          visited_at?: string
          visitor_hash?: string | null
          session_id?: string | null
          is_first_visit?: boolean
          referrer?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          device_type?: string | null
          user_agent?: string | null
          country_code?: string | null
          city?: string | null
          created_at?: string
        };
        Update: {
          id?: string
          owner_id?: string
          site_id?: string
          business_id?: string | null
          visited_at?: string
          visitor_hash?: string | null
          session_id?: string | null
          is_first_visit?: boolean
          referrer?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          device_type?: string | null
          user_agent?: string | null
          country_code?: string | null
          city?: string | null
          created_at?: string
        };
        Relationships: [
          {
            foreignKeyName: "site_visits_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_visits_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_visits_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "generated_sites";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      monthly_site_report: {
        Row: {
          owner_id: string | null
          site_id: string | null
          business_id: string | null
          business_name: string | null
          public_code: string | null
          template: Database["public"]["Enums"]["site_template"] | null
          month: string | null
          visits: number | null
          unique_visitors: number | null
          sessions: number | null
          clicks: number | null
          whatsapp_clicks: number | null
          phone_clicks: number | null
          menu_item_clicks: number | null
          directions_clicks: number | null
          click_through_rate: number | null
        };
        Relationships: [];
      };
    };
    Functions: {
      current_owner_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      generate_public_code: {
        Args: {
          p_length?: number;
        };
        Returns: string;
      };
      is_region_search_stale: {
        Args: {
          p_region_id: string;
          p_max_age_days?: number;
        };
        Returns: boolean;
      };
      is_site_live: {
        Args: {
          p_site_id: string;
        };
        Returns: boolean;
      };
      record_site_click: {
        Args: {
          p_public_code: string;
          p_target: Database["public"]["Enums"]["click_target"];
          p_target_value?: string;
          p_menu_item_id?: string;
          p_visit_id?: string;
          p_session_id?: string;
          p_visitor_hash?: string;
        };
        Returns: string;
      };
      record_site_visit: {
        Args: {
          p_public_code: string;
          p_visitor_hash?: string;
          p_session_id?: string;
          p_referrer?: string;
          p_device_type?: string;
          p_user_agent?: string;
          p_country_code?: string;
          p_city?: string;
          p_utm_source?: string;
          p_utm_medium?: string;
          p_utm_campaign?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      click_target: "whatsapp" | "phone" | "email" | "directions" | "menu_item" | "social" | "external_link" | "other";
      deal_stage: "new" | "contacted" | "meeting_scheduled" | "proposal_sent" | "negotiating" | "won" | "lost" | "on_hold";
      site_status: "draft" | "published" | "expired" | "archived";
      site_template: "standard" | "food_service";
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

/** Atalhos para as entidades mais usadas. */
export type SearchedRegion = Tables<"searched_regions">;
export type RegionSearch = Tables<"region_searches">;
export type Business = Tables<"businesses">;
export type GeneratedSite = Tables<"generated_sites">;
export type MenuItem = Tables<"menu_items">;
export type Deal = Tables<"deals">;
export type DealStageEvent = Tables<"deal_stage_events">;
export type SiteVisit = Tables<"site_visits">;
export type SiteClick = Tables<"site_clicks">;
export type MonthlySiteReport = Views<"monthly_site_report">;

export type SiteTemplate = Enums<"site_template">;
export type SiteStatus = Enums<"site_status">;
export type DealStage = Enums<"deal_stage">;
export type ClickTarget = Enums<"click_target">;
