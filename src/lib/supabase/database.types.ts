export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      app_login_failure_events: {
        Row: {
          id: number;
          account_key: string;
          origin_key: string;
          pair_key: string;
          occurred_at: string;
        };
        Insert: {
          id?: number;
          account_key: string;
          origin_key: string;
          pair_key: string;
          occurred_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["app_login_failure_events"]["Insert"]>;
        Relationships: [];
      };      app_login_rate_limits: {
        Row: {
          attempt_key: string;
          blocked_until: string | null;
          created_at: string;
          failed_count: number;
          updated_at: string;
          window_started_at: string;
        };
        Insert: {
          attempt_key: string;
          blocked_until?: string | null;
          created_at?: string;
          failed_count?: number;
          updated_at?: string;
          window_started_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["app_login_rate_limits"]["Insert"]>;
        Relationships: [];
      };
      app_operation_rate_limits: {
        Row: {
          quota_key: string;
          request_count: number;
          window_started_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          quota_key: string;
          request_count?: number;
          window_started_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["app_operation_rate_limits"]["Insert"]>;
        Relationships: [];
      };
      app_sessions: {
        Row: {
          id: string;
          user_id: string;
          token_hash: string;
          expires_at: string;
          created_at: string;
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token_hash: string;
          expires_at: string;
          created_at?: string;
          last_seen_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["app_sessions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "app_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
        ];
      };
      app_users: {
        Row: {
          id: string;
          username: string;
          username_normalized: string;
          display_name: string;
          role: Database["public"]["Enums"]["app_user_role"];
          pin_salt: string;
          pin_hash: string;
          active: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          display_name: string;
          role?: Database["public"]["Enums"]["app_user_role"];
          pin_salt: string;
          pin_hash: string;
          active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["app_users"]["Insert"]>;
        Relationships: [];
      };
      user_monthly_goals: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          fichas_target: number;
          pieces_target: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          month: string;
          fichas_target?: number;
          pieces_target?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_monthly_goals"]["Insert"]>;
        Relationships: [];
      };
      ficha_status_events: {
        Row: {
          id: string;
          ficha_id: string;
          changed_by_user_id: string | null;
          from_status: Database["public"]["Enums"]["ficha_status"] | null;
          to_status: Database["public"]["Enums"]["ficha_status"];
          created_at: string;
        };
        Insert: {
          id?: string;
          ficha_id: string;
          changed_by_user_id?: string | null;
          from_status?: Database["public"]["Enums"]["ficha_status"] | null;
          to_status: Database["public"]["Enums"]["ficha_status"];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ficha_status_events"]["Insert"]>;
        Relationships: [];
      };
      ficha_ownership_audit: {
        Row: {
          id: string;
          ficha_id: string;
          previous_user_id: string | null;
          new_user_id: string | null;
          changed_by_user_id: string | null;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ficha_id: string;
          previous_user_id?: string | null;
          new_user_id?: string | null;
          changed_by_user_id?: string | null;
          reason?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ficha_ownership_audit"]["Insert"]>;
        Relationships: [];
      };
      catalog_items: {
        Row: {
          id: string;
          kind: Database["public"]["Enums"]["catalog_item_kind"];
          name: string;
          slug: string;
          aliases: string[];
          description: string | null;
          metadata: Json;
          active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kind: Database["public"]["Enums"]["catalog_item_kind"];
          name: string;
          slug: string;
          aliases?: string[];
          description?: string | null;
          metadata?: Json;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["catalog_items"]["Insert"]>;
        Relationships: [];
      };
      kanban_columns: {
        Row: {
          id: string;
          slug: string;
          name: string;
          order_index: number;
          is_system: boolean;
          color_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          order_index: number;
          is_system?: boolean;
          color_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["kanban_columns"]["Insert"]>;
        Relationships: [];
      };
      clientes: {
        Row: {
          id: string;
          nome: string;
          nome_normalizado: string;
          email: string | null;
          telefone: string | null;
          primeira_ficha: string | null;
          ultima_ficha: string | null;
          total_fichas: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          email?: string | null;
          telefone?: string | null;
          primeira_ficha?: string | null;
          ultima_ficha?: string | null;
          total_fichas?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          email?: string | null;
          telefone?: string | null;
          primeira_ficha?: string | null;
          ultima_ficha?: string | null;
          total_fichas?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fichas: {
        Row: {
          id: string;
          legacy_ficha_id: number | null;
          cliente_id: string | null;
          cliente_nome_snapshot: string;
          cliente_auxiliar: string | null;
          vendedor: string | null;
          data_inicio: string | null;
          numero_venda: string | null;
          data_entrega: string;
          evento: boolean;
          status: Database["public"]["Enums"]["ficha_status"];
          kanban_status: Database["public"]["Enums"]["kanban_status"];
          kanban_column_id: string;
          kanban_ordem: number;
          is_manual_card: boolean;
          kanban_status_updated_at: string;
          insumo_status: Database["public"]["Enums"]["insumo_status"];
          material: string | null;
          composicao: string | null;
          etiqueta: string | null;
          cor_material: string | null;
          manga: string | null;
          acabamento_manga: string | null;
          cor_acabamento_manga: string | null;
          largura_manga: string | null;
          gola: string | null;
          acabamento_gola: string | null;
          cor_detalhe_gola: string | null;
          cor_gola: string | null;
          largura_gola: string | null;
          cor_peitilho_interno: string | null;
          cor_peitilho_externo: string | null;
          cor_pe_de_gola_interno: string | null;
          cor_pe_de_gola_externo: string | null;
          cor_botao: string | null;
          abertura_lateral: string | null;
          cor_abertura_lateral: string | null;
          reforco_gola: string | null;
          cor_reforco: string | null;
          bolso: string | null;
          filete: string | null;
          filete_local: string | null;
          filete_cor: string | null;
          faixa: string | null;
          faixa_local: string | null;
          faixa_cor: string | null;
          arte: string | null;
          cor_sublimacao: string | null;
          com_nomes: number | null;
          observacoes: string | null;
          observacoes_html: string | null;
          lista_ia: Json | null;
          lista_ia_anexada: boolean;
          lista_nomes_raw: string | null;
          lista_nomes_raw_anexada: boolean;
          metadados: Json;
          created_at: string;
          updated_at: string;
          created_by_user_id: string | null;
          delivered_at: string | null;
        };
        Insert: {
          id?: string;
          legacy_ficha_id?: number | null;
          cliente_id?: string | null;
          cliente_nome_snapshot: string;
          cliente_auxiliar?: string | null;
          vendedor?: string | null;
          data_inicio?: string | null;
          numero_venda?: string | null;
          data_entrega: string;
          evento?: boolean;
          created_by_user_id?: string | null;
          status?: Database["public"]["Enums"]["ficha_status"];
          kanban_status?: Database["public"]["Enums"]["kanban_status"];
          kanban_column_id?: string;
          kanban_ordem?: number;
          is_manual_card?: boolean;
          kanban_status_updated_at?: string;
          insumo_status?: Database["public"]["Enums"]["insumo_status"];
          material?: string | null;
          composicao?: string | null;
          etiqueta?: string | null;
          cor_material?: string | null;
          manga?: string | null;
          acabamento_manga?: string | null;
          cor_acabamento_manga?: string | null;
          largura_manga?: string | null;
          gola?: string | null;
          acabamento_gola?: string | null;
          cor_detalhe_gola?: string | null;
          cor_gola?: string | null;
          largura_gola?: string | null;
          cor_peitilho_interno?: string | null;
          cor_peitilho_externo?: string | null;
          cor_pe_de_gola_interno?: string | null;
          cor_pe_de_gola_externo?: string | null;
          cor_botao?: string | null;
          abertura_lateral?: string | null;
          cor_abertura_lateral?: string | null;
          reforco_gola?: string | null;
          cor_reforco?: string | null;
          bolso?: string | null;
          filete?: string | null;
          filete_local?: string | null;
          filete_cor?: string | null;
          faixa?: string | null;
          faixa_local?: string | null;
          faixa_cor?: string | null;
          arte?: string | null;
          cor_sublimacao?: string | null;
          com_nomes?: number | null;
          observacoes?: string | null;
          observacoes_html?: string | null;
          lista_ia?: Json | null;
          lista_ia_anexada?: never;
          lista_nomes_raw?: string | null;
          lista_nomes_raw_anexada?: never;
          metadados?: Json;
          created_at?: string;
          updated_at?: string;
          delivered_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["fichas"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "fichas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fichas_kanban_column_id_fkey";
            columns: ["kanban_column_id"];
            isOneToOne: false;
            referencedRelation: "kanban_columns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fichas_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
        ];
      };
      ficha_itens: {
        Row: {
          id: string;
          ficha_id: string;
          produto_modelo_id: string | null;
          ordem: number;
          produto: string | null;
          descricao: string | null;
          tamanho: string | null;
          quantidade: number;
          detalhes: string | null;
          detalhes_produto: string | null;
          dados: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          ficha_id: string;
          produto_modelo_id?: string | null;
          ordem?: number;
          produto?: string | null;
          descricao?: string | null;
          tamanho?: string | null;
          quantidade?: number;
          detalhes?: string | null;
          detalhes_produto?: string | null;
          dados?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ficha_itens"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "ficha_itens_ficha_id_fkey";
            columns: ["ficha_id"];
            isOneToOne: false;
            referencedRelation: "fichas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ficha_itens_produto_modelo_id_fkey";
            columns: ["produto_modelo_id"];
            isOneToOne: false;
            referencedRelation: "produto_modelos";
            referencedColumns: ["id"];
          },
        ];
      };
      ficha_imagens: {
        Row: {
          id: string;
          ficha_id: string;
          ordem: number;
          url: string;
          storage_path: string | null;
          alt_text: string | null;
          width: number | null;
          height: number | null;
          bytes: number | null;
          dados: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          ficha_id: string;
          ordem?: number;
          url: string;
          storage_path?: string | null;
          alt_text?: string | null;
          width?: number | null;
          height?: number | null;
          bytes?: number | null;
          dados?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ficha_imagens"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "ficha_imagens_ficha_id_fkey";
            columns: ["ficha_id"];
            isOneToOne: false;
            referencedRelation: "fichas";
            referencedColumns: ["id"];
          },
        ];
      };
      produto_modelos: {
        Row: {
          id: string;
          slug: string;
          nome: string;
          categoria: string | null;
          ativo: boolean;
          dados: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          nome: string;
          categoria?: string | null;
          ativo?: boolean;
          dados?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["produto_modelos"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      clear_login_attempts: {
        Args: {
          p_attempt_keys: string[];
        };
        Returns: undefined;
      };
      consume_login_attempt: {
        Args: {
          p_attempt_keys: string[];
        };
        Returns: number;
      };
      consume_operation_quota: {
        Args: {
          p_limit: number;
          p_quota_key: string;
          p_window_seconds: number;
        };
        Returns: number;
      };
      create_kanban_column_atomic: {
        Args: { p_base_slug: string; p_name: string };
        Returns: string;
      };
      create_manual_kanban_card_atomic: {
        Args: {
          p_actor_id: string;
          p_arte: string | null;
          p_column_id: string;
          p_data_entrega: string;
          p_evento: boolean;
          p_material: string | null;
          p_title: string;
        };
        Returns: string;
      };
      record_login_failure: {
        Args: { p_attempt_keys: string[] };
        Returns: undefined;
      };
      resolve_app_session: {
        Args: { p_seen_at: string; p_token_hash: string };
        Returns: Array<{
          active: boolean;
          display_name: string;
          expires_at: string;
          last_seen_at: string;
          role: Database["public"]["Enums"]["app_user_role"];
          user_id: string;
          username: string;
        }>;
      };      save_ficha_atomic: {
        Args: {
          p_actor_id: string;
          p_ficha: Json;
          p_ficha_id: string | null;
          p_imagens: Json;
          p_itens: Json;
        };
        Returns: string;
      };
      get_report_details_page: {
        Args: {
          p_end: string;
          p_evento: boolean | null;
          p_limit: number;
          p_offset: number;
          p_start: string;
          p_status: string | null;
        };
        Returns: Array<{
          cliente: string;
          data: string | null;
          id: string;
          material: string;
          quantidade: number;
          status: Database["public"]["Enums"]["ficha_status"];
          total_count: number;
          vendedor: string;
        }>;
      };
      get_report_summary: {
        Args: {
          p_delivery_year_end: string;
          p_delivery_year_start: string;
          p_end: string;
          p_evento: boolean | null;
          p_previous_end: string;
          p_previous_start: string;
          p_start: string;
          p_status: string | null;
        };
        Returns: Json;
      };
      get_kanban_board_cards: {
        Args: {
          p_arte?: string | null;
          p_material?: string | null;
          p_search?: string | null;
          p_week_end?: string | null;
          p_week_start?: string | null;
        };
        Returns: Array<{
          arte: string | null;
          cliente_auxiliar: string | null;
          cliente_nome_snapshot: string;
          data_entrega: string;
          evento: boolean;
          id: string;
          is_manual_card: boolean;
          item_quantity: number;
          kanban_column_id: string;
          kanban_ordem: number;
          kanban_status: Database["public"]["Enums"]["kanban_status"];
          material: string | null;
          numero_venda: string | null;
          status: Database["public"]["Enums"]["ficha_status"];
          thumb_url: string | null;
          vendedor: string | null;
        }>;
      };
      cleanup_application_retention: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{
          audit_deleted: number;
          login_limits_deleted: number;
          operation_limits_deleted: number;
          sessions_deleted: number;
        }>;
      };
      get_personal_dashboard_summary: {
        Args: { p_previous_since: string; p_since: string | null; p_today: string; p_user_id: string };
        Returns: Json;
      };
      get_personal_fichas_page: {
        Args: {
          p_limit: number;
          p_offset: number;
          p_search: string;
          p_status: string;
          p_today: string;
          p_user_id: string;
        };
        Returns: Array<{
          arte: string | null;
          cliente_nome_snapshot: string;
          created_at: string;
          data_entrega: string;
          delivered_at: string | null;
          id: string;
          image_url: string | null;
          numero_venda: string | null;
          pieces: number;
          status: Database["public"]["Enums"]["ficha_status"];
          total_count: number;
          updated_at: string;
          vendedor: string | null;
        }>;
      };      move_kanban_card: {
        Args: {
          p_ficha_id: string;
          p_kanban_column_id: string;
          p_target_index?: number;
        };
        Returns: undefined;
      };
      reorder_kanban_columns: {
        Args: {
          p_column_ids: string[];
        };
        Returns: undefined;
      };
      set_ficha_delivery_status_atomic: {
        Args: { p_actor_id: string; p_delivered: boolean; p_ficha_id: string };
        Returns: undefined;
      };      sort_kanban_cards_by_delivery_date: {
        Args: {
          p_kanban_column_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_user_role: "superadmin" | "operador";
      catalog_item_kind:
        | "produto"
        | "tamanho"
        | "tecido"
        | "cor"
        | "manga"
        | "acabamento_manga"
        | "gola"
        | "acabamento_gola"
        | "bolso";
      ficha_status: "pendente" | "entregue";
      kanban_status: "pendente" | "exportando" | "fila_impressao" | "sublimando" | "na_costura";
      insumo_status: "tudo_ok" | "sem_tecido" | "sem_tinta" | "sem_papel" | "pendencias";
    };
  };
};
