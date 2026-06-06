export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      question_options: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          question_id: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label: string;
          question_id: string;
          sort_order: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          question_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'question_options_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'question_result_stats';
            referencedColumns: ['question_id'];
          },
          {
            foreignKeyName: 'question_options_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
        ];
      };
      questions: {
        Row: {
          allow_multiple: boolean;
          created_at: string;
          id: string;
          prompt: string;
          sort_order: number;
          survey_id: string;
        };
        Insert: {
          allow_multiple?: boolean;
          created_at?: string;
          id?: string;
          prompt: string;
          sort_order: number;
          survey_id: string;
        };
        Update: {
          allow_multiple?: boolean;
          created_at?: string;
          id?: string;
          prompt?: string;
          sort_order?: number;
          survey_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'questions_survey_id_fkey';
            columns: ['survey_id'];
            isOneToOne: false;
            referencedRelation: 'surveys';
            referencedColumns: ['id'];
          },
        ];
      };
      survey_responses: {
        Row: {
          created_at: string;
          id: string;
          option_id: string;
          question_id: string;
          survey_id: string;
          voter_token: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          option_id: string;
          question_id: string;
          survey_id: string;
          voter_token: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          option_id?: string;
          question_id?: string;
          survey_id?: string;
          voter_token?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'survey_responses_option_id_fkey';
            columns: ['option_id'];
            isOneToOne: false;
            referencedRelation: 'question_options';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'survey_responses_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'survey_responses_survey_id_fkey';
            columns: ['survey_id'];
            isOneToOne: false;
            referencedRelation: 'surveys';
            referencedColumns: ['id'];
          },
        ];
      };
      surveys: {
        Row: {
          category: string | null;
          created_at: string;
          deadline: string | null;
          description: string;
          id: string;
          status: string;
          title: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          deadline?: string | null;
          description?: string;
          id?: string;
          status?: string;
          title: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          deadline?: string | null;
          description?: string;
          id?: string;
          status?: string;
          title?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      question_result_stats: {
        Row: {
          allow_multiple: boolean | null;
          option_id: string | null;
          option_label: string | null;
          option_sort_order: number | null;
          question_id: string | null;
          question_prompt: string | null;
          question_sort_order: number | null;
          survey_id: string | null;
          vote_count: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'questions_survey_id_fkey';
            columns: ['survey_id'];
            isOneToOne: false;
            referencedRelation: 'surveys';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      cast_survey_vote: {
        Args: {
          p_option_id: string;
          p_question_id: string;
          p_survey_id: string;
          p_voter_token: string;
        };
        Returns: undefined;
      };
      retract_survey_vote: {
        Args: {
          p_option_id: string;
          p_question_id: string;
          p_voter_token: string;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type SurveyRow = Database['public']['Tables']['surveys']['Row'];
export type QuestionRow = Database['public']['Tables']['questions']['Row'];
export type QuestionOptionRow = Database['public']['Tables']['question_options']['Row'];
export type QuestionResultStatRow =
  Database['public']['Views']['question_result_stats']['Row'];
