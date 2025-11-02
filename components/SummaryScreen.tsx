import React, { useState } from 'react';
import type { QuestionResponse, StudentInfo } from '../types';
import { CheckCircleIcon } from './icons';

interface SummaryScreenProps {
  studentInfo: StudentInfo;
  responses: QuestionResponse[];
  onRestart: () => void;
}

const SummaryScreen: React.FC<SummaryScreenProps> = ({ studentInfo, responses, onRestart }) => {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleEmailSubmit = () => {
    const surveyDate = new Date().toLocaleDateString();
    const subject = `Transition Survey Results for ${studentInfo.name}`;
    
    let body = `Hello ${studentInfo.teacher.name},\n\n`;
    body += `Here are the results from the Dynamic Transitions survey completed by ${studentInfo.name} on ${surveyDate}.\n\n`;
    body += `--- SURVEY DETAILS ---\n`;
    body += `Student: ${studentInfo.name}\n`;
    body += `Grade: ${studentInfo.grade}\n`;
    body += `Teacher: ${studentInfo.teacher.name}\n`;
    body += `Survey Type: ${studentInfo.survey_type.replace('_spin', ' ')}\n`;
    body += `Stated Goal: ${studentInfo.goal}\n`;
    body += `------------------------\n\n`;

    responses.forEach((res, index) => {
        body += `Question ${index + 1} (${res.question.category}):\n`;
        body += `${res.question.question_text}\n`;
        body += `Answer: ${res.answer}\n\n`;
    });

    const mailtoLink = `mailto:${studentInfo.teacher.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoLink;
    setIsSubmitted(true);
  };


  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-10">
        <div className="text-center mb-8">
            <CheckCircleIcon className="w-16 h-16 text-[#A2C5AC] mx-auto mb-4"/>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Survey Complete!</h1>
            <p className="text-gray-500 mt-2">Great job, {studentInfo.name}! Here's a summary of your responses.</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Survey Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                <p><span className="font-medium text-gray-600">Student:</span> {studentInfo.name}</p>
                <p><span className="font-medium text-gray-600">Grade:</span> {studentInfo.grade}</p>
                <p><span className="font-medium text-gray-600">Teacher:</span> {studentInfo.teacher.name}</p>
                <p><span className="font-medium text-gray-600 capitalize">Survey Type:</span> {studentInfo.survey_type.replace('_spin', ' ')}</p>
                {studentInfo.goal && <p><span className="font-medium text-gray-600">Goal:</span> {studentInfo.goal}</p>}
            </div>
        </div>

        <div className="space-y-6">
          {responses.map((res, index) => (
            <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                <p className="text-xs font-semibold text-[#6A9084] uppercase tracking-wide mb-1">{res.question.category}</p>
                <p className="font-medium text-gray-800">{index + 1}. {res.question.question_text}</p>
                <p className="text-gray-600 mt-1 pl-4 border-l-2 border-[#A2C5AC]/30">{res.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          {!isSubmitted ? (
            <button
                onClick={handleEmailSubmit}
                className="bg-[#A2C5AC] text-gray-800 font-bold py-3 px-6 rounded-lg hover:bg-[#9DB5B2] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A2C5AC] text-lg"
            >
                Submit Survey to {studentInfo.teacher.name}
            </button>
          ) : (
            <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-[#878E99] bg-[#A2C5AC]/20 p-3 rounded-lg">
                    <CheckCircleIcon className="w-5 h-5"/>
                    <p className="font-semibold">Survey results are ready to be sent!</p>
                </div>
                <button
                    onClick={onRestart}
                    className="bg-[#A2C5AC] text-gray-800 font-bold py-3 px-6 rounded-lg hover:bg-[#9DB5B2] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A2C5AC] text-lg"
                >
                    Start a New Survey
                </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryScreen;