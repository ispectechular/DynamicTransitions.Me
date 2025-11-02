import type { SurveyType, Teacher } from './types';

export const APP_TITLE = "Dynamic Transitions";

export const SURVEY_TYPES: { value: SurveyType; label: string; description: string }[] = [
  {
    value: 'career_and_education_spin',
    label: 'Career & Education',
    description: 'Explore career paths and the education needed to achieve them. (Approx. 15-20 mins)',
  },
  {
    value: 'independent_spin',
    label: 'Independent Living',
    description: 'Focus on skills for living independently, like budgeting and daily routines. (Approx. 10-15 mins)',
  },
];

export const GRADE_LEVELS: number[] = [6, 7, 8, 9, 10, 11, 12];

export const MIDDLE_SCHOOL_TEACHERS: Teacher[] = [
    { name: "Jessica Miller", email: "jmiller@wawasee.k12.in.us" },
    { name: "Ben Eshbach", email: "beshbach@wawasee.k12.in.us" },
];

export const HIGH_SCHOOL_TEACHERS: Teacher[] = [
    { name: "Jesse Ritter", email: "jritter@wawasee.k12.in.us" },
    { name: "Gordon Collins", email: "gcollins@wawasee.k12.in.us" },
];

export const MAX_QUESTIONS: { [key in SurveyType]: number } = {
  career_and_education_spin: 30,
  independent_spin: 15,
};

export const POSITIVE_MESSAGES: string[] = [
  "Crafting the next question...",
  "Thinking up something good...",
  "Analyzing your responses...",
  "Just a moment...",
  "Building your survey...",
];

export const TTS_VOICES = [
    { name: 'Kore', label: 'Kore (Female)' },
    { name: 'Puck', label: 'Puck (Male)' },
    { name: 'Charon', label: 'Charon (Male)' },
    { name: 'Zephyr', label: 'Zephyr (Female)' },
    { name: 'Fenrir', label: 'Fenrir (Male)' },
];

// IMPORTANT: Replace this with your deployed Google Apps Script URL.
// This URL is used to submit the survey results to the teacher via email.
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby48X_DwzA0cmdy6c6EhnARp8d8i4SLJzpgxMO63gmlGs90AiBJ5vgjs-Za5S5YmY7fuw/exec';