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

/**
 * --- INSTRUCTIONS FOR GOOGLE APPS SCRIPT ---
 * This URL enables the "Submit to Teacher" button to automatically email the PDF report.
 *
 * ONE-TIME SETUP (5 minutes):
 * 1. Go to script.google.com and create a new project.
 * 2. Replace the placeholder code in the `Code.gs` file with the Apps Script code provided in our conversation.
 * 3. Click "Deploy" > "New deployment".
 * 4. For "Select type", click the gear icon and choose "Web app".
 * 5. Under "Configuration":
 *    - Give it a description (e.g., "Survey Submitter").
 *    - Set "Execute as" to "Me ([your email address])".
 *    - Set "Who has access" to "Anyone". **<-- This is very important!
 * 6. Click "Deploy".
 * 7. Click "Authorize access" and approve the permissions for your Google Account.
 * 8. Copy the "Web app URL" and paste it below, replacing the placeholder text.
 */
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyxkJjrK1EzvcU5bgSDcJ35ewbTk2SmKg5dezpG3q6yGjGXAMl8BNlQfZK5Lq5L_qa_Ew/exec';