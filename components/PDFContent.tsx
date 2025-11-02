import React from 'react';
import type { QuestionResponse, StudentInfo, QuestionCategory } from '../types';

/**
 * Formats a survey answer for display. Joins arrays with a comma.
 * @param answer The answer, which can be a string or an array of strings.
 * @returns A formatted string.
 */
export const formatAnswer = (answer: string | string[]): string => {
    return Array.isArray(answer) ? answer.join(', ') : String(answer);
};

/**
 * A component that defines the standardized, professional layout for the PDF report.
 * It's designed to be rendered off-screen and captured for PDF generation.
 */
export const PDFContent: React.FC<{ studentInfo: StudentInfo; responses: QuestionResponse[]; title: string }> = ({ studentInfo, responses, title }) => {
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
            <h2 style={{ fontSize: '20px', fontWeight: 'normal', color: '#555', marginBottom: '30px' }}>Transition Survey for {studentInfo.name}</h2>
            
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
                            <td style={{ padding: '8px', textTransform: 'capitalize' }}>{studentInfo.survey_type.replace(/_/g, ' ').replace('spin', '')}</td>
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
                        <div key={category} style={{ marginBottom: '25px' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '15px' }}>{category}</h4>
                            {groupedResponses[category].map((res, index) => (
                                <div key={index} style={{ marginBottom: '18px', pageBreakInside: 'avoid' }}>
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