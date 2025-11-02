import React, { useState } from 'react';
import type { QuestionResponse, StudentInfo, QuestionCategory } from '../types';
import { APPS_SCRIPT_URL } from '../constants';
import { CheckCircleIcon, DownloadIcon, SendIcon } from './icons';
import { PDFContent, formatAnswer } from './PDFContent';

declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}

interface SummaryScreenProps {
  studentInfo: StudentInfo;
  responses: QuestionResponse[];
  onRestart: () => void;
  title: string;
}

const SummaryScreen: React.FC<SummaryScreenProps> = ({ studentInfo, responses, onRestart, title }) => {
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

  // Helper function to generate a potentially multi-page PDF
  const createMultiPagePdf = async () => {
    const { jsPDF } = window.jspdf;
    const pdfContentElement = document.getElementById('pdf-content-wrapper');
    if (!pdfContentElement) {
        throw new Error("PDF content element not found. Cannot generate PDF.");
    }

    const canvas = await window.html2canvas(pdfContentElement, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate the height of the image in the PDF, maintaining aspect ratio
    const imgProperties = pdf.getImageProperties(imgData);
    const totalPdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;

    let heightLeft = totalPdfHeight;
    let position = 0;

    // Add the first page
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, totalPdfHeight);
    heightLeft -= pageHeight;

    // Add subsequent pages if the content is taller than one page
    while (heightLeft > 0) {
        position -= pageHeight; // Move the image "up" on the new page to show the next part
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, totalPdfHeight);
        heightLeft -= pageHeight;
    }
    
    return pdf;
  };


  const generateAndSubmitPdf = async () => {
    if (APPS_SCRIPT_URL.includes('PASTE_YOUR_DEPLOYED_APPS_SCRIPT_URL_HERE')) {
      setErrorDetails('The application is not configured for submission. Please set up the Google Apps Script URL.');
      setSubmissionState('error');
      return;
    }
    
    setSubmissionState('submitting');
    setErrorDetails('');

    try {
      // 1. Generate the multi-page PDF
      const pdf = await createMultiPagePdf();

      // 2. Get PDF as a base64 string
      const pdfDataUri = pdf.output('datauristring');
      const base64Pdf = pdfDataUri.split('base64,')[1];
      
      // 3. Create a filename and the payload for the script
      const surveyDate = new Date().toLocaleDateString('en-CA');
      const fileName = `TransitionSurvey-${studentInfo.name.replace(/\s/g, '_')}-${surveyDate}.pdf`;

      const payload = {
        recipient: studentInfo.teacher.email,
        title: title,
        studentName: studentInfo.name,
        grade: studentInfo.grade,
        pdfData: base64Pdf,
        fileName: fileName,
      };

      // 4. Send the payload to Google Apps Script.
      // Using 'no-cors' mode to bypass the CORS preflight issue with Google Apps Script.
      // This means we cannot read the response, so we'll have to optimistically
      // assume success if the request itself doesn't throw a network error.
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Added to bypass CORS errors
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      // Since we can't read the response in 'no-cors' mode, we optimistically set success.
      // The catch block will handle network-level failures.
      setSubmissionState('success');

    } catch (error: any) {
      console.error("Error submitting survey:", error);
      setErrorDetails(`Failed to send the email. Error: ${error.message}. You can still download the PDF manually below.`);
      setSubmissionState('error');
    }
  };

  const handleManualPdfDownload = async () => {
    try {
        const pdf = await createMultiPagePdf();
        const surveyDate = new Date().toLocaleDateString('en-CA');
        const fileName = `TransitionSurvey-${studentInfo.name.replace(/\s/g, '_')}-${surveyDate}.pdf`;
        pdf.save(fileName);
    } catch(e: any) {
        console.error("Error creating manual PDF:", e);
        setErrorDetails(e.message || "An unknown error occurred while generating the PDF.");
        setSubmissionState('error');
    }
  };
  
  const renderSubmissionArea = () => {
    switch(submissionState) {
        case 'submitting':
            return (
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A2C5AC] mx-auto mb-4"></div>
                    <p className="text-lg text-gray-600">Generating PDF & submitting to {studentInfo.teacher.name}...</p>
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
                        onClick={generateAndSubmitPdf}
                        className="bg-[#A2C5AC] text-gray-800 font-bold py-4 px-8 rounded-lg hover:bg-[#9DB5B2] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A2C5AC] text-xl inline-flex items-center gap-3"
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
        {/* This hidden div is used for generating the PDF content */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }}>
            <PDFContent studentInfo={studentInfo} responses={responses} title={title} />
        </div>
        <div className="w-full max-w-3xl mx-auto p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-10">
            <div className="text-center mb-8">
                <CheckCircleIcon className="w-16 h-16 text-[#A2C5AC] mx-auto mb-4"/>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Survey Complete!</h1>
                <p className="text-gray-500 mt-2">Great job, {studentInfo.name}! Here's a summary of your responses.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-8 text-sm">
                <h3 className="font-semibold text-gray-800">Report Title</h3>
                <p className="text-lg italic text-gray-700">"{title}"</p>
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