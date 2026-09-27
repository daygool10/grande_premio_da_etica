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
      games: {
        Row: {
          id: string;
          game_code: string;
          admin_id: string;
          current_question_index: number;
          phase: string;
          question_revealed: boolean;
          race_length?: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          game_code: string;
          admin_id: string;
          current_question_index: number;
          phase: string;
          question_revealed: boolean;
          race_length?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          id: string;
          game_code: string;
          admin_id: string;
          current_question_index: number;
          phase: string;
          question_revealed: boolean;
          race_length?: number;
          created_at: string;
          updated_at: string;
        }>;
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          game_id: string;
          team_name: string;
          f1_team: string;
          position: number;
          skipped_turn: boolean;
          is_connected: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          team_name: string;
          f1_team: string;
          position: number;
          skipped_turn: boolean;
          is_connected: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          id: string;
          game_id: string;
          team_name: string;
          f1_team: string;
          position: number;
          skipped_turn: boolean;
          is_connected: boolean;
          created_at: string;
          updated_at: string;
        }>;
        Relationships: [];
      };
      answers: {
        Row: {
          id: string;
          game_id: string;
          player_id: string;
          question_index: number;
          selected_option: number;
          is_correct: boolean;
          answered_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          player_id: string;
          question_index: number;
          selected_option: number;
          is_correct: boolean;
          answered_at?: string;
        };
        Update: Partial<{
          id: string;
          game_id: string;
          player_id: string;
          question_index: number;
          selected_option: number;
          is_correct: boolean;
          answered_at: string;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type GameRow = Database['public']['Tables']['games']['Row'];
export type PlayerRow = Database['public']['Tables']['players']['Row'];
export type AnswerRow = Database['public']['Tables']['answers']['Row'];