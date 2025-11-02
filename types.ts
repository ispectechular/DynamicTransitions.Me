export type SurveyType = "career_spin" | "education_spin" | "independent_spin";
export type QuestionCategory = "Strengths" | "Preferences" | "Interests" | "Needs";
export type QuestionType = "multiple_choice" | "written" | "multiple_select";

export interface Teacher {
  name: string;
  email: string;
}

export interface StudentInfo {
  name: string;
  grade: number;
  teacher: Teacher;
  survey_type: SurveyType;
  goal: string;
}

export interface QuestionResponse {
  question: GeneratedQuestion;
  answer: string | string[];
}

export interface SurveyData {
  student_info: StudentInfo;
  responses: QuestionResponse[];
}

export interface GeneratedQuestion {
  category: QuestionCategory;
  question_text: string;
  type: QuestionType;
  options?: string[];
}
