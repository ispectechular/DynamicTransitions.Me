import React, { useState, useEffect } from 'react';
import type { QuestionResponse, StudentInfo, QuestionCategory } from '../types';
import { generateSummaryTitle } from '../services/geminiService';
import { APPS_SCRIPT_URL } from '../constants';
import { CheckCircleIcon, DownloadIcon, SendIcon } from './icons';

declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}

// FIX: Defined SummaryScreenProps interface to fix a TypeScript error.
interface SummaryScreenProps {
  studentInfo: StudentInfo;
  responses: QuestionResponse[];
  onRestart: () => void;
}

const formatAnswer = (answer: string | string[]): string => {
    return Array.isArray(answer) ? answer.join(', ') : answer;
};

// This component is now only used for the fallback PDF download.
const PDFContent: React.FC<{ studentInfo: StudentInfo; responses: QuestionResponse[]; title: string }> = ({ studentInfo, responses, title }) => {
    const surveyDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const groupedResponses = responses.reduce((acc, res) => {
        const category = res.question.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(res);
        return acc;
    }, {} as Record<QuestionCategory, QuestionResponse[]>);
    const categoryOrder: QuestionCategory[] = ["Strengths", "Preferences", "Interests", "Needs"];


    return (
        <div id="pdf-content-wrapper" style={{ width: '794px', padding: '60px', backgroundColor: 'white', color: 'black', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', borderBottom: '2px solid #A2C5AC', paddingBottom: '10px', marginBottom: '10px' }}>{title}</h1>
            <h2 style={{ fontSize: '20px', fontWeight: 'normal', color: '#555', marginBottom: '30px' }}>Dynamic Transitions Survey for {studentInfo.name}</h2>
            
            <div style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '20px', marginBottom: '30px', border: '1px solid #eee' }}>
                 <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>Survey Details</h3>
                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                     <tbody>
                        <tr>
                            <td style={{ padding: '8px', fontWeight: 'bold' }}>Student:</td>
                            <td style={{ padding: '8px' }}>{studentInfo.name}</td>
                            <td style={{ padding: '8px', fontWeight: 'bold' }}>Teacher:</td>
                            <td style={{ padding: '8px' }}>{studentInfo.teacher.name}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '8px', fontWeight: 'bold' }}>Grade:</td>
                            <td style={{ padding: '8px' }}>{studentInfo.grade}</td>
                            <td style={{ padding: '8px', fontWeight: 'bold' }}>Survey Date:</td>
                            <td style={{ padding: '8px' }}>{surveyDate}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '8px', fontWeight: 'bold' }}>Survey Type:</td>
                            <td style={{ padding: '8px', textTransform: 'capitalize' }}>{studentInfo.survey_type.replace('_spin', '')}</td>
                            <td style={{ padding: '8px', fontWeight: 'bold' }}>Stated Goal:</td>
                            <td style={{ padding: '8px' }}>{studentInfo.goal || 'N/A'}</td>
                        </tr>
                     </tbody>
                 </table>
            </div>

            <div style={{ marginTop: '30px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '20px' }}>Responses</h3>
                {categoryOrder.map(category => (
                    groupedResponses[category] && (
                        <div key={category} style={{ marginBottom: '25px', pageBreakInside: 'avoid' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '15px' }}>{category}</h4>
                            {groupedResponses[category].map((res, index) => (
                                <div key={index} style={{ marginBottom: '18px' }}>
                                    <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#444', margin: '0 0 8px 0' }}>{res.question.question_text}</p>
                                    <p style={{ fontSize: '16px', color: '#555', margin: '0 0 0 20px', borderLeft: '3px solid #A2C5AC', paddingLeft: '15px' }}>{formatAnswer(res.answer)}</p>
                                </div>
                            ))}
                        </div>
                    )
                ))}
            </div>
        </div>
    );
};

const SummaryScreen: React.FC<SummaryScreenProps> = ({ studentInfo, responses, onRestart }) => {
  const [summaryTitle, setSummaryTitle] = useState('Survey Summary');
  const [isTitleLoading, setIsTitleLoading] = useState(true);
  const [submissionState, setSubmissionState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorDetails, setErrorDetails] = useState('');

  const groupedResponses = responses.reduce((acc, res) => {
    const category = res.question.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(res);
    return acc;
  }, {} as Record<QuestionCategory, QuestionResponse[]>);

  const categoryOrder: QuestionCategory[] = ["Strengths", "Preferences", "Interests", "Needs"];


  useEffect(() => {
    const fetchTitle = async () => {
        setIsTitleLoading(true);
        try {
            const title = await generateSummaryTitle({ student_info: studentInfo, responses });
            setSummaryTitle(title);
        } catch (e) {
            console.error("Failed to generate summary title, using default.", e);
            setSummaryTitle("Student Transition Plan");
        } finally {
            setIsTitleLoading(false);
        }
    };
    fetchTitle();
  }, [studentInfo, responses]);

  const handleSubmitToTeacher = async () => {
    if (APPS_SCRIPT_URL.includes('PASTE_YOUR_DEPLOYED_APPS_SCRIPT_URL_HERE')) {
      setErrorDetails('The application is not configured for submission. Please set up the Google Apps Script URL.');
      setSubmissionState('error');
      return;
    }

    setSubmissionState('submitting');
    setErrorDetails('');

    try {
      const payload = {
        studentInfo,
        responses,
        title: summaryTitle,
      };

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Required by Apps Script
        body: JSON.stringify(payload),
        redirect: 'follow',
      });
      
      const result = await response.json();

      if (result.status === 'success') {
        setSubmissionState('success');
      } else {
        throw new Error(result.message || 'The script returned an unknown error.');
      }
    } catch (error: any) {
      console.error("Error submitting survey:", error);
      setErrorDetails(`Failed to send the email. Error: ${error.message}. You can still download the PDF manually below.`);
      setSubmissionState('error');
    }
  };

  const handleManualPdfDownload = async () => {
    const { jsPDF } = window.jspdf;
    const pdfContentElement = document.getElementById('pdf-content-wrapper');
    if (!pdfContentElement) return;

    const canvas = await window.html2canvas(pdfContentElement, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = canvas.height * pdfWidth / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
    
    const surveyDate = new Date().toLocaleDateString('en-CA');
    const fileName = `TransitionSurvey-${studentInfo.name.replace(/\s/g, '_')}-${surveyDate}.pdf`;
    pdf.save(fileName);
  };
  
  const renderSubmissionArea = () => {
    switch(submissionState) {
        case 'submitting':
            return (
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A2C5AC] mx-auto mb-4"></div>
                    <p className="text-lg text-gray-600">Submitting to {studentInfo.teacher.name}...</p>
                </div>
            );
        case 'success':
            return (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex flex-col items-center text-center">
                    <CheckCircleIcon className="w-12 h-12 text-green-500 mb-3" />
                    <h3 className="text-xl font-semibold text-green-800">Successfully Sent!</h3>
                    <p className="text-green-700 mt-1">The report has been emailed to {studentInfo.teacher.name}.</p>
                </div>
            );
        case 'error':
             return (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <h3 className="text-xl font-semibold text-red-800">Submission Failed</h3>
                    <p className="text-red-700 mt-2 mb-4">{errorDetails}</p>
                    <button onClick={handleManualPdfDownload} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors inline-flex items-center gap-2">
                        <DownloadIcon className="w-5 h-5" /> Download PDF Manually
                    </button>
                </div>
            );
        case 'idle':
        default:
            return (
                <div className="text-center">
                    <p className="text-gray-600 mb-4">
                        Click below to automatically generate a PDF and email it to <strong>{studentInfo.teacher.name}</strong>.
                    </p>
                    <button
                        onClick={handleSubmitToTeacher}
                        disabled={isTitleLoading}
                        className="bg-[#A2C5AC] text-gray-800 font-bold py-4 px-8 rounded-lg hover:bg-[#9DB5B2] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A2C5AC] text-xl inline-flex items-center gap-3 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        <SendIcon className="w-6 h-6" />
                        Submit to Teacher
                    </button>
                </div>
            );
    }
  }

  return (
    <>
        <div style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }}>
            <PDFContent studentInfo={studentInfo} responses={responses} title={summaryTitle} />
        </div>
        <div className="w-full max-w-3xl mx-auto p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-10">
            <div className="text-center mb-8">
                <CheckCircleIcon className="w-16 h-16 text-[#A2C5AC] mx-auto mb-4"/>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Survey Complete!</h1>
                <p className="text-gray-500 mt-2">Great job, {studentInfo.name}! Here's a summary of your responses.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-8 text-sm">
                <h3 className="font-semibold text-gray-800 mb-2">Generated Report Title</h3>
                {isTitleLoading ? <div className="h-5 bg-gray-200 rounded-md w-3/4 animate-pulse"></div> : <p className="text-lg italic text-gray-700">"{summaryTitle}"</p>}
            </div>

            <div className="space-y-8">
              {categoryOrder.map(category => (
                groupedResponses[category] && (
                    <div key={category}>
                        <h3 className="text-xl font-bold text-gray-800 border-b-2 border-[#A2C5AC] pb-2 mb-4">{category}</h3>
                        <div className="space-y-5">
                            {groupedResponses[category].map((res, index) => (
                                <div key={index}>
                                    <p className="font-medium text-gray-800">{res.question.question_text}</p>
                                    <p className="text-gray-600 mt-1 pl-4 border-l-2 border-[#A2C5AC]/30">{formatAnswer(res.answer)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-gray-200">
                {renderSubmissionArea()}
                <div className="text-center pt-8 mt-6">
                    <button onClick={onRestart} className="text-gray-600 hover:text-gray-900 font-semibold">
                        or Start a New Survey
                    </button>
                </div>
            </div>
          </div>
        </div>
    </>
  );
};

export default SummaryScreen;