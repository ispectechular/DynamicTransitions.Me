import type { SurveyType, Teacher } from './types';

export const APP_TITLE = "Dynamic Transitions";
export const MAX_QUESTIONS = 15;

export const SURVEY_TYPES: { value: SurveyType; label: string; description: string }[] = [
  { value: "career_spin", label: "Career", description: "Explore job and work-related goals." },
  { value: "education_spin", label: "Education", description: "Focus on college or training after high school." },
  { value: "independent_spin", label: "Independent Living", description: "Plan for living on your own." },
];

export const GRADE_LEVELS = ['6', '7', '8', '9', '10', '11', '12'];

export const MIDDLE_SCHOOL_TEACHERS: Teacher[] = [
    { name: 'Jennifer Philips', email: 'jennifer.phillips@wawasee.k12.in.us' },
    { name: 'Heather Desomer', email: 'hdesomer@wawasee.k12.in.us' },
];

export const HIGH_SCHOOL_TEACHERS: Teacher[] = [
    { name: 'Kari Baker', email: 'kbaker@wawasee.k12.in.us' },
    { name: 'Jill Hackleman', email: 'jill.hackleman@wawasee.k12.in.us' },
    { name: 'Wendy Ortiz', email: 'wortiz@wawasee.k12.in.us' },
    { name: 'Jesse Ritter', email: 'jritter@wawasee.k12.in.us' },
    { name: 'David Shipley', email: 'dshipley@wawasee.k12.in.us' },
    { name: 'Christy Troutman', email: 'ctroutman@wawasee.k12.in.us' },
];

export const TTS_VOICES = [
    { name: 'Kore', label: 'Kore (Female)' },
    { name: 'Puck', label: 'Puck (Male)' },
    { name: 'Charon', label: 'Charon (Male)' },
    { name: 'Fenrir', label: 'Fenrir (Male)' },
    { name: 'Zephyr', label: 'Zephyr (Female)' },
];


export const POSITIVE_MESSAGES = [
    "Great answer!",
    "You're doing an awesome job!",
    "Keep up the great work!",
    "That's a very thoughtful response.",
    "This is really helpful, thank you!",
    "Awesome insight!",
    "Perfect, let's keep going!",
];

export const EDUCATION_GOAL_OPTIONS = [
    "Go to a 4-year college",
    "Go to a 2-year community college",
    "Go to a trade or vocational school",
    "Get on-the-job training or an apprenticeship",
    "Join the military",
    "I'm not sure yet",
];