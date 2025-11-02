import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { SurveyData, GeneratedQuestion, QuestionCategory, SurveyType } from '../types';

// Per Gemini API guidelines, initialize with process.env.API_KEY directly and assume it's available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const model = 'gemini-2.5-flash';

// Updated instruction with grade-level adaptation and written question limit.
const independentLivingSystemInstruction = `You are Dynamic Transitions, an AI survey assistant. Your purpose is to generate the next batch of transition assessment questions for a high school student with an IEP, based on their profile and previous answers. The survey is about Independent Living. The questions must be clear, age-appropriate, accessible, and cycle through the SPIN framework (Strengths, Preferences, Interests, Needs).

**Key Rules:**
1.  **Grade-Level Adaptation:** Adjust the reading level and complexity of questions for the student's grade. For grades 6-8, use simpler language and concrete examples. For grades 9-12, questions can be more forward-looking.
2.  **Written Question Limit:** The survey is 15 questions long and can have a maximum of 4 written questions in total. Analyze previous responses to respect this limit.
3.  **No Repetition:** Do not repeat questions.
4.  **Output Format:** Your output must be ONLY a single, valid JSON object with a "questions" key, which holds an array of 3-4 question objects. Each question object must have the structure: {"category": "Strengths" | "Preferences" | "Interests" | "Needs", "question_text": "string", "type": "multiple_choice" | "multiple_select" | "written", "options"?: ["option1", "option2", "option3", "option4"]}.
5.  **Question Types:** Use 'multiple_select' where multiple answers are reasonable. Use 'multiple_choice' for single-answer questions.
6.  **Conversational Tone:** Make the questions conversational, addressing the student by name occasionally.`;

// Updated instruction with grade-level adaptation and written question limit.
const careerAndEducationSystemInstruction = `You are Dynamic Transitions, an AI survey assistant. Your purpose is to generate the next batch of transition assessment questions for a high school student with an IEP. This is a combined Career and Education survey, up to 30 questions long.

The survey has two parts:
1.  **Career (First ~15 questions):** Focus on the student's career goals, strengths, interests, and needs related to work.
2.  **Education (Second ~15 questions):** Focus on the education or training needed to achieve the career goals discussed. These questions should be specific and follow up on the career answers.

**Key Rules:**
1.  **Grade-Level Adaptation:** Adjust the reading level and complexity of questions for the student's grade. For grades 6-8, use simpler language and focus on broad career exploration. For grades 9-12, ask more specific questions about post-secondary plans and job skills.
2.  **Written Question Limit:** The entire survey can have a maximum of 4 written questions. Analyze previous responses to respect this limit.
3.  **Survey Transition:** Around the halfway point (after 14-16 questions), you MUST provide a clear transition question or statement before moving to education topics. For example: "Great, now that we've explored some career ideas, let's switch gears. What kind of education or training do you think you'll need for that path?".
4.  **No Repetition & SPIN Framework:** Do not repeat questions, and cycle through the SPIN framework (Strengths, Preferences, Interests, Needs).
5.  **Output Format:** Your output must be ONLY a single, valid JSON object with a "questions" key, holding an array of 3-4 question objects. Each question object must have the structure: {"category": "Strengths" | "Preferences" | "Interests" | "Needs", "question_text": "string", "type": "multiple_choice" | "multiple_select" | "written", "options"?: ["option1", "option2", "option3", "option4"]}.
6.  **Question Types:** Use 'multiple_select' where multiple answers are reasonable.
7.  **Conversational Tone:** Make questions conversational and address the student by name occasionally.`;


export const generateQuestionBatch = async (surveyData: SurveyData): Promise<GeneratedQuestion[]> => {
  try {
    const { survey_type } = surveyData.student_info;
    const systemInstruction = survey_type === 'career_and_education_spin' ? careerAndEducationSystemInstruction : independentLivingSystemInstruction;

    const prompt = `Generate the next batch of 3-4 questions for ${surveyData.student_info.name} (Grade ${surveyData.student_info.grade}) based on this data: ${JSON.stringify(surveyData, null, 2)}`;
    
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        // Per Gemini API guidelines, specify responseMimeType and schema for reliable JSON output.
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  question_text: { type: Type.STRING },
                  type: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['category', 'question_text', 'type'],
              },
            },
          },
          required: ['questions'],
        },
      }
    });

    const text = response.text.trim();
    // With a responseSchema, we can directly parse the JSON without cleaning markdown backticks.
    const generatedResult = JSON.parse(text);
    const questions: any[] = generatedResult.questions;

    if (!questions || !Array.isArray(questions)) {
        throw new Error("Invalid response format: 'questions' array not found.");
    }

    // Sanitize and validate questions to prevent data type errors from the AI model.
    const sanitizedQuestions = questions
      .filter((q: any) => q && q.category && q.question_text && q.type && String(q.question_text).trim() !== '')
      .map((q: any) => {
        // CRITICAL FIX: Ensure all core text fields are strings.
        q.question_text = String(q.question_text);
        q.category = String(q.category);
        q.type = String(q.type);

        if ((q.type === 'multiple_choice' || q.type === 'multiple_select')) {
            if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
                // If AI fails to provide valid options, gracefully degrade to a written question.
                q.type = 'written';
                delete q.options;
            } else {
                // CRITICAL FIX: Ensure all options are strings to prevent downstream errors.
                q.options = q.options.map(String);
            }
        }
        return q as GeneratedQuestion;
    });
    
    // If the entire batch from the AI was malformed, throw an error to trigger fallback.
    if (sanitizedQuestions.length === 0 && questions.length > 0) {
        throw new Error("Received a batch of malformed questions from the AI.");
    }

    return sanitizedQuestions;
  } catch (error) {
    console.error("Error generating question batch with Gemini, returning a fallback. Error:", error);
    
    const fallbackCategory: QuestionCategory = surveyData.responses.length % 4 === 0 ? 'Strengths' : 
                                               surveyData.responses.length % 4 === 1 ? 'Preferences' : 
                                               surveyData.responses.length % 4 === 2 ? 'Interests' : 'Needs';

    return [{
        category: fallbackCategory,
        question_text: "Let's try a different question. What's something you enjoy doing?",
        type: "written"
    }];
  }
};

export const generateSpeech = async (text: string, voiceName: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      // Per Gemini API guidelines, pass the text directly for TTS.
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio data received from API.");
    }
    return base64Audio;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};