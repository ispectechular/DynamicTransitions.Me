import { GoogleGenAI, Modality } from "@google/genai";
import type { SurveyData, GeneratedQuestion, QuestionCategory } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable is not set. The app will not function correctly.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });
const model = 'gemini-2.5-flash';

const systemInstruction = `You are Dynamic Transitions, an AI survey assistant. Your purpose is to generate the next batch of transition assessment questions for a high school student with an IEP, based on their profile and previous answers. The questions must be clear, age-appropriate, accessible, and cycle through the SPIN framework (Strengths, Preferences, Interests, Needs). Do not repeat questions. Tailor questions to the student's stated goal. Your output must be ONLY a single, valid JSON object with a "questions" key, which holds an array of 3-4 question objects. Each question object must have the structure: {"category": "Strengths" | "Preferences" | "Interests" | "Needs", "question_text": "string", "type": "multiple_choice" | "written", "options"?: ["option1", "option2", "option3", "option4"]}. The survey is 15 questions long and can have up to 2 written questions in total. The goal for a "career_spin" survey is a career, for "education_spin" it's a field of study, for "independent_spin" it's a living situation. Make the questions conversational, addressing the student by name only once in a while to feel natural.`;


export const generateQuestionBatch = async (surveyData: SurveyData): Promise<GeneratedQuestion[]> => {
  try {
    const prompt = `Generate the next batch of 3-4 questions for ${surveyData.student_info.name} (Grade ${surveyData.student_info.grade}) based on this data: ${JSON.stringify(surveyData, null, 2)}`;
    
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    const text = response.text.trim();
    const jsonString = text.replace(/^```json\s*|```$/g, '');
    
    const generatedResult = JSON.parse(jsonString);

    if (!generatedResult.questions || !Array.isArray(generatedResult.questions)) {
        throw new Error("Invalid response format: 'questions' array not found.");
    }

    // Basic validation for each question in the batch
    generatedResult.questions.forEach((q: GeneratedQuestion) => {
        if (!q.category || !q.question_text || !q.type) {
            throw new Error(`Invalid question format in batch: ${JSON.stringify(q)}`);
        }
        if (q.type === 'multiple_choice' && (!q.options || q.options.length < 2)) {
            throw new Error(`Multiple choice question received with insufficient options: ${q.question_text}`);
        }
    });
    
    return generatedResult.questions;
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
      contents: [{ parts: [{ text: `Read this aloud: ${text}` }] }],
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