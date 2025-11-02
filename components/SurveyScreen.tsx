import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import type { GeneratedQuestion } from '../types';
import { POSITIVE_MESSAGES } from '../constants';
import LoadingSpinner from './LoadingSpinner';
import { generateSpeech } from '../services/geminiService';
import { SpeakerOnIcon, SpeakerOffIcon, PlayIcon, PauseIcon, SettingsIcon, CheckCircleIcon } from './icons';
import { decode, decodeAudioData } from '../audioUtils';
import { AudioSettingsContext } from '../contexts/AudioSettingsContext';
import SettingsModal from './SettingsModal';


interface SurveyScreenProps {
  question: GeneratedQuestion;
  questionNumber: number;
  maxQuestions: number;
  isLoading: boolean;
  onSubmitAnswer: (answer: string | string[]) => void;
  onGoBack: () => void;
}

const SurveyScreen: React.FC<SurveyScreenProps> = ({ question, questionNumber, maxQuestions, isLoading, onSubmitAnswer, onGoBack }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [writtenAnswer, setWrittenAnswer] = useState('');
  const [error, setError] = useState('');
  const [key, setKey] = useState(questionNumber);
  const [loadingMessage, setLoadingMessage] = useState(POSITIVE_MESSAGES[0]);

  // State and refs for Text-to-Speech
  const { settings, toggleTts } = useContext(AudioSettingsContext);
  const isTtsOn = settings.isTtsOn;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReadyToPlay, setIsReadyToPlay] = useState(false);
  const [isFetchingCurrentAudio, setIsFetchingCurrentAudio] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentlyReading, setCurrentlyReading] = useState<string | null>(null);
  const [autoPlayed, setAutoPlayed] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const speechQueueRef = useRef<{ text: string; id: string }[]>([]);
  const isSpeakingRef = useRef(false);
  const audioBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());


  useEffect(() => {
    setSelectedAnswers([]);
    setWrittenAnswer('');
    setError('');
    setKey(questionNumber);
  }, [questionNumber, question]);

  useEffect(() => {
    if (isLoading) {
      setLoadingMessage(POSITIVE_MESSAGES[Math.floor(Math.random() * POSITIVE_MESSAGES.length)]);
    }
  }, [isLoading]);
  
  const stopAllAudio = useCallback(() => {
    if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
    }
    activeSourcesRef.current.forEach(source => {
        source.onended = null;
        try { source.stop(); } catch (e) { /* Already stopped */ }
    });
    activeSourcesRef.current.clear();
    speechQueueRef.current = [];
    isSpeakingRef.current = false;
    setCurrentlyReading(null);
    setIsPlaying(false);
  }, []);
  
  const buildSpeechQueue = useCallback(() => {
    const itemsToRead = [{ text: question.question_text, id: 'question-text' }];
    if (question.type === 'multiple_choice' || question.type === 'multiple_select') {
        itemsToRead.push({ text: "Answers:", id: 'answers-cue' });
        question.options?.forEach((option, index) => {
            itemsToRead.push({ text: option, id: `option-${index}` });
        });
    }
    speechQueueRef.current = itemsToRead;
    audioBufferCacheRef.current.clear();
    setIsReadyToPlay(true);
  }, [question]);

  const playFromQueue = useCallback(async () => {
    if (isSpeakingRef.current || speechQueueRef.current.length === 0 || !isTtsOn) {
        return;
    }
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
    }
    await audioContextRef.current.resume();

    isSpeakingRef.current = true;
    const item = speechQueueRef.current[0];
    setCurrentlyReading(item.id);

    // Proactively fetch the next audio clip to reduce delay
    const nextItem = speechQueueRef.current[1];
    if (nextItem && !audioBufferCacheRef.current.has(nextItem.id)) {
        generateSpeech(nextItem.text, settings.voice)
            .then(base64 => decode(base64))
            .then(data => decodeAudioData(data, audioContextRef.current!, 24000, 1))
            .then(buffer => {
                if(buffer) audioBufferCacheRef.current.set(nextItem.id, buffer);
            })
            .catch(error => console.error(`Failed to pre-fetch audio for "${nextItem.text}"`, error));
    }
    
    let audioBuffer = audioBufferCacheRef.current.get(item.id);
    
    if (!audioBuffer) {
        setIsFetchingCurrentAudio(true);
        try {
            const base64Audio = await generateSpeech(item.text, settings.voice);
            const audioData = decode(base64Audio);
            audioBuffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
            if(audioBuffer) audioBufferCacheRef.current.set(item.id, audioBuffer);
        } catch (error) {
            console.error(`Failed to fetch/decode audio for "${item.text}"`, error);
            speechQueueRef.current.shift();
            isSpeakingRef.current = false;
            setIsFetchingCurrentAudio(false);
            playFromQueue();
            return;
        } finally {
            setIsFetchingCurrentAudio(false);
        }
    }


    if (audioBuffer && gainNodeRef.current) {
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        
        source.playbackRate.value = settings.rate;
        gainNodeRef.current.gain.value = settings.volume;
        source.connect(gainNodeRef.current);
        
        source.onended = () => {
            activeSourcesRef.current.delete(source);
            if (speechQueueRef.current[0]?.id === item.id) {
                speechQueueRef.current.shift();
            }
            isSpeakingRef.current = false;
            if (speechQueueRef.current.length === 0) {
                setCurrentlyReading(null);
                setIsPlaying(false);
            } else {
                playFromQueue();
            }
        };
        
        activeSourcesRef.current.add(source);
        source.start();
    } else {
        console.warn(`Audio buffer not found for ${item.id}. Skipping.`);
        speechQueueRef.current.shift();
        isSpeakingRef.current = false;
        playFromQueue();
    }
  }, [isTtsOn, settings]);

  const handlePlayPause = useCallback(async () => {
    if (!isTtsOn) return;

    if (speechQueueRef.current.length === 0 && !isSpeakingRef.current) {
        buildSpeechQueue();
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    if (!isReadyToPlay) return;

    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
    }

    if (audioContextRef.current.state === 'running') {
        await audioContextRef.current.suspend();
        setIsPlaying(false);
    } else {
        await audioContextRef.current.resume();
        setIsPlaying(true);
        if (!isSpeakingRef.current && speechQueueRef.current.length > 0) {
            playFromQueue();
        }
    }
  }, [isTtsOn, isReadyToPlay, playFromQueue, buildSpeechQueue]);

  useEffect(() => {
    stopAllAudio();
    setAutoPlayed(false);
    setIsReadyToPlay(false);
    if (isTtsOn && !isLoading) {
        buildSpeechQueue();
    }
    return () => {
        stopAllAudio();
    };
  }, [question, isTtsOn, isLoading, stopAllAudio, settings.voice, buildSpeechQueue]);

  useEffect(() => {
    // Autoplay when a new question is ready, TTS is on, and it hasn't played yet.
    if (isTtsOn && isReadyToPlay && !autoPlayed && !isLoading) {
        handlePlayPause();
        setAutoPlayed(true);
    }
  }, [isTtsOn, isReadyToPlay, autoPlayed, isLoading, handlePlayPause]);


  const handleSubmit = () => {
    let answer: string | string[];

    if (question.type === 'multiple_choice' || question.type === 'multiple_select') {
        answer = selectedAnswers;
    } else {
        answer = writtenAnswer.trim();
    }
    
    if (question.type === 'multiple_choice' && answer.length !== 1) {
      setError('Please select one answer.');
      return;
    }
    if ((question.type === 'multiple_select' || question.type === 'multiple_choice') && answer.length === 0) {
        setError('Please select at least one answer.');
        return;
    }
    if (question.type === 'written' && !answer) {
        setError('Please provide an answer.');
        return;
    }

    setError('');
    stopAllAudio();
    onSubmitAnswer(question.type === 'multiple_choice' ? answer[0] : answer);
  };

  const handleSelectOption = (option: string) => {
    if (question.type === 'multiple_choice') {
        setSelectedAnswers([option]);
    } else if (question.type === 'multiple_select') {
        setSelectedAnswers(prev => 
            prev.includes(option) ? prev.filter(item => item !== option) : [...prev, option]
        );
    }
  };
  
  const progressPercentage = (questionNumber / maxQuestions) * 100;

  const renderAnswerOptions = () => {
    if (question.type === 'written') {
        return (
            <textarea
                value={writtenAnswer}
                onChange={(e) => setWrittenAnswer(e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg text-lg focus:ring-[#A2C5AC] focus:border-[#A2C5AC] min-h-[120px]"
                placeholder="Type your answer here..."
            />
        );
    }

    if (question.type === 'multiple_choice' || question.type === 'multiple_select') {
        return (
            <div className="space-y-3">
                {question.options?.map((option, index) => {
                    const isSelected = selectedAnswers.includes(option);
                    return (
                        <button
                            id={`option-${index}`}
                            key={index}
                            onClick={() => handleSelectOption(option)}
                            className={`w-full text-left p-4 border rounded-lg transition-all duration-300 text-lg flex items-center justify-between ${
                                isSelected
                                    ? 'border-[#A2C5AC] ring-2 ring-[#A2C5AC] bg-[#A2C5AC]/10'
                                    : 'border-gray-300 hover:border-[#878E99] hover:bg-gray-50'
                            } ${currentlyReading === `option-${index}` ? 'bg-[#A2C5AC]/20' : ''}`}
                        >
                            <span>{option}</span>
                            {isSelected && <CheckCircleIcon className="w-6 h-6 text-[#A2C5AC]" />}
                        </button>
                    );
                })}
            </div>
        );
    }
    return null;
  };

  return (
    <>
    <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-10">
        <div className="mb-8">
            <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
                <span>Question {questionNumber} of {maxQuestions}</span>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">{question.category}</span>
                  <div className="flex items-center gap-1">
                    {isTtsOn && (
                        <>
                        <button
                            onClick={handlePlayPause}
                            disabled={!isReadyToPlay}
                            className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 transition-colors disabled:text-gray-300 disabled:cursor-not-allowed"
                            title={isPlaying ? 'Pause audio' : 'Play audio'}
                        >
                            {isFetchingCurrentAudio ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div> : isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                        </button>
                         <button onClick={() => setIsSettingsOpen(true)} title="Audio settings" className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 transition-colors">
                            <SettingsIcon className="w-5 h-5" />
                        </button>
                        </>
                    )}
                    <button onClick={toggleTts} title={isTtsOn ? 'Turn off text-to-speech' : 'Turn on text-to-speech'} className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 transition-colors">
                        {isTtsOn ? <SpeakerOnIcon className="w-5 h-5" /> : <SpeakerOffIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-[#A2C5AC] h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
            </div>
        </div>

        <div className="min-h-[300px]">
          {isLoading && questionNumber > 1 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <LoadingSpinner />
              <p className="text-gray-500 mt-2 text-lg font-semibold">{loadingMessage}</p>
            </div>
          ) : (
            <div key={key} className="animate-[fadeIn_0.5s_ease-in-out]">
              <h2 id="question-text" className={`text-2xl sm:text-3xl font-bold text-gray-800 mb-6 p-2 rounded-md transition-colors duration-300 ${currentlyReading === 'question-text' ? 'bg-[#A2C5AC]/20' : ''}`}>{question.question_text}</h2>
              {renderAnswerOptions()}
            </div>
          )}
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
            {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
            <div className="flex items-center gap-4">
                 <button
                    onClick={onGoBack}
                    disabled={questionNumber === 1}
                    className="bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 text-lg disabled:bg-[#D3D5D4] disabled:text-[#878E99]/70 disabled:cursor-not-allowed"
                 >
                    Back
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full bg-[#A2C5AC] text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-[#9DB5B2] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A2C5AC] text-lg disabled:bg-[#A2C5AC]/50 disabled:cursor-not-allowed"
                >
                    {questionNumber === maxQuestions ? 'Finish Survey' : 'Next Question'}
                </button>
            </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default SurveyScreen;