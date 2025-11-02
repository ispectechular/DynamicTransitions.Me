import React, { useState, useEffect, useCallback } from 'react';
import type { SurveyData, GeneratedQuestion, StudentInfo, QuestionResponse } from './types';
import StartScreen from './components/StartScreen';
import SurveyScreen from './components/SurveyScreen';
import SummaryScreen from './components/SummaryScreen';
import { generateQuestionBatch } from './services/geminiService';
import { MAX_QUESTIONS } from './constants';
import LoadingSpinner from './components/LoadingSpinner';
import { AudioSettingsProvider } from './contexts/AudioSettingsContext';

const App: React.FC = () => {
  enum Screen {
    Start,
    Survey,
    Summary,
  }

  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Start);
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [questionQueue, setQuestionQueue] = useState<GeneratedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = questionQueue.length > 0 ? questionQueue[0] : null;

  const fetchQuestionBatch = useCallback(async (currentData: SurveyData) => {
    if (isFetching) return;
    setIsFetching(true);
    setError(null);
    try {
      const questions = await generateQuestionBatch(currentData);
      setQuestionQueue(prev => [...prev, ...questions]);
    } catch (err) {
      setError('Failed to generate the next question. Please try again.');
      console.error(err);
    } finally {
      setIsFetching(false);
      setIsLoading(false); // Also turn off the initial loading state
    }
  }, [isFetching]);

  const handleStartSurvey = (studentInfo: StudentInfo) => {
    const initialData: SurveyData = { student_info: studentInfo, responses: [] };
    setSurveyData(initialData);
    setCurrentScreen(Screen.Survey);
    setIsLoading(true);
    fetchQuestionBatch(initialData);
  };

  const handleSubmitAnswer = (answer: string | string[]) => {
    if (!surveyData || !currentQuestion) return;

    const newResponse: QuestionResponse = {
      question: currentQuestion,
      answer: answer,
    };

    const updatedData = {
      ...surveyData,
      responses: [...surveyData.responses, newResponse],
    };

    setSurveyData(updatedData);

    const newQueue = questionQueue.slice(1);
    setQuestionQueue(newQueue);
    
    if (updatedData.responses.length >= MAX_QUESTIONS) {
        setCurrentScreen(Screen.Summary);
    } else if (newQueue.length === 0) {
        setIsLoading(true); // Show loading while fetching the next immediate batch
        fetchQuestionBatch(updatedData);
    }
  };
  
  const handleGoBack = () => {
    if (!surveyData || surveyData.responses.length === 0) return;

    const lastResponse = surveyData.responses[surveyData.responses.length - 1];
    const previousQuestion = lastResponse.question;

    const updatedResponses = surveyData.responses.slice(0, -1);
    const updatedData = {
        ...surveyData,
        responses: updatedResponses,
    };
    setSurveyData(updatedData);

    setQuestionQueue(prevQueue => [previousQuestion, ...prevQueue]);
  };

  useEffect(() => {
    // Proactively fetch more questions when the queue is running low
    if (surveyData && questionQueue.length > 0 && questionQueue.length <= 2 && surveyData.responses.length < MAX_QUESTIONS - 2) {
      fetchQuestionBatch(surveyData);
    }
  }, [questionQueue.length, surveyData, fetchQuestionBatch]);


  const handleRestart = () => {
    setSurveyData(null);
    setQuestionQueue([]);
    setError(null);
    setCurrentScreen(Screen.Start);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.Survey:
        if (isLoading || !currentQuestion || !surveyData) {
            return (
                <div className="bg-white rounded-2xl shadow-xl p-10 text-center">
                    <LoadingSpinner />
                    <p className="text-gray-500 mt-2">Preparing the survey for {surveyData?.student_info.name}...</p>
                </div>
            );
        }
        return (
          <SurveyScreen
            question={currentQuestion}
            questionNumber={surveyData.responses.length + 1}
            isLoading={questionQueue.length === 1 && isFetching}
            onSubmitAnswer={handleSubmitAnswer}
            onGoBack={handleGoBack}
          />
        );
      case Screen.Summary:
        if (!surveyData) return null;
        return (
            <SummaryScreen
              studentInfo={surveyData.student_info}
              responses={surveyData.responses}
              onRestart={handleRestart}
            />
        );
      case Screen.Start:
      default:
        return <StartScreen onStartSurvey={handleStartSurvey} />;
    }
  };

  return (
    <AudioSettingsProvider>
        <main className="min-h-screen bg-[#9DB5B2] flex items-center justify-center py-8">
        {error && <div className="absolute top-4 bg-red-500 text-white p-4 rounded-lg shadow-lg">{error}</div>}
        {renderScreen()}
        </main>
    </AudioSettingsProvider>
  );
};

export default App;
