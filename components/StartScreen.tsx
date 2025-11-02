import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import type { StudentInfo, SurveyType, Teacher } from '../types';
import { SURVEY_TYPES, APP_TITLE, MIDDLE_SCHOOL_TEACHERS, HIGH_SCHOOL_TEACHERS, GRADE_LEVELS, EDUCATION_GOAL_OPTIONS } from '../constants';
import { CareerIcon, EducationIcon, IndependentLivingIcon, SpeakerOnIcon, SpeakerOffIcon, PlayIcon, PauseIcon, SettingsIcon } from './icons';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../audioUtils';
import { AudioSettingsContext } from '../contexts/AudioSettingsContext';
import SettingsModal from './SettingsModal';

interface StartScreenProps {
  onStartSurvey: (studentInfo: StudentInfo) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStartSurvey }) => {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [teacher, setTeacher] = useState<string>('');
  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);
  const [surveyType, setSurveyType] = useState<SurveyType>('career_spin');
  const [goal, setGoal] = useState('');
  const [error, setError] = useState('');

  // State and refs for Text-to-Speech
  const [isTtsOn, setIsTtsOn] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReadyToPlay, setIsReadyToPlay] = useState(false);
  const [isFetchingCurrentAudio, setIsFetchingCurrentAudio] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentlyReading, setCurrentlyReading] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const speechQueueRef = useRef<{ text: string; id: string }[]>([]);
  const isSpeakingRef = useRef(false);
  const audioBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const { settings } = useContext(AudioSettingsContext);

  useEffect(() => {
    setGoal('');
    setError('');
  }, [surveyType]);
  
  useEffect(() => {
    const gradeNum = parseInt(grade, 10);
    if (gradeNum >= 6 && gradeNum <= 8) {
        setAvailableTeachers(MIDDLE_SCHOOL_TEACHERS);
        setTeacher(JSON.stringify(MIDDLE_SCHOOL_TEACHERS[0]));
    } else if (gradeNum >= 9 && gradeNum <= 12) {
        setAvailableTeachers(HIGH_SCHOOL_TEACHERS);
        setTeacher(JSON.stringify(HIGH_SCHOOL_TEACHERS[0]));
    } else {
        setAvailableTeachers([]);
        setTeacher('');
    }
  }, [grade]);

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
            if (buffer) audioBufferCacheRef.current.set(nextItem.id, buffer);
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
            if (audioBuffer) audioBufferCacheRef.current.set(item.id, audioBuffer);
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
    if (!isTtsOn || !isReadyToPlay) return;

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
  }, [isTtsOn, isReadyToPlay, playFromQueue]);
  
  useEffect(() => {
    stopAllAudio();
    if (!isTtsOn) return;

    setIsReadyToPlay(false);

    const itemsToRead = [
        { id: 'app-title', text: APP_TITLE },
        { id: 'app-subtitle', text: 'AI-powered surveys for student success.' },
        { id: 'name-label', text: "Student's Name" },
        { id: 'grade-label', text: "Grade" },
        { id: 'teacher-label', text: 'Teacher of Record' },
        { id: 'survey-type-label', text: 'Survey Type' },
    ];

    SURVEY_TYPES.forEach((type) => {
        itemsToRead.push({ id: `survey-type-${type.value}`, text: `${type.label}. ${type.description}` });
    });

    switch (surveyType) {
      case 'career_spin':
        itemsToRead.push({ id: 'goal-label-career', text: "What is a career goal you're thinking about?" });
        break;
      case 'education_spin':
        itemsToRead.push({ id: 'goal-label-education', text: 'What is your main goal for education after high school?' });
        EDUCATION_GOAL_OPTIONS.forEach((option, index) => {
            itemsToRead.push({ id: `goal-option-${index}`, text: option });
        });
        break;
      case 'independent_spin':
        // No extra items
        break;
    }
    itemsToRead.push({ id: 'start-button', text: 'Start Survey' });

    speechQueueRef.current = itemsToRead;
    audioBufferCacheRef.current.clear();
    setIsReadyToPlay(true);
    
    return () => stopAllAudio();
  }, [isTtsOn, surveyType, stopAllAudio, settings.voice]);


  const getIcon = (type: SurveyType) => {
    switch(type) {
      case 'career_spin': return <CareerIcon className="w-8 h-8 text-[#A2C5AC]" />;
      case 'education_spin': return <EducationIcon className="w-8 h-8 text-[#A2C5AC]" />;
      case 'independent_spin': return <IndependentLivingIcon className="w-8 h-8 text-[#A2C5AC]" />;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !grade || !teacher.trim() || (surveyType !== 'independent_spin' && !goal.trim())) {
      setError('Please fill out all required fields.');
      return;
    }
    setError('');
    stopAllAudio();
    const selectedTeacher: Teacher = JSON.parse(teacher);
    onStartSurvey({ name: name.trim(), grade: parseInt(grade, 10), teacher: selectedTeacher, survey_type: surveyType, goal: goal.trim() });
  };

  const renderGoalInput = () => {
    const highlightClass = (id: string) => currentlyReading === id ? 'bg-[#A2C5AC]/20' : '';
    switch (surveyType) {
      case 'career_spin':
        return (
          <div>
            <label id="goal-label-career" htmlFor="goal" className={`block text-sm font-medium text-gray-700 mb-1 p-1 rounded-md transition-colors duration-300 ${highlightClass('goal-label-career')}`}>
              What is a career goal you're thinking about?
            </label>
            <input type="text" id="goal" value={goal} onChange={e => setGoal(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#A2C5AC] focus:border-[#A2C5AC]" placeholder="e.g., Working with animals" />
          </div>
        );
      case 'education_spin':
        return (
          <div>
            <span id="goal-label-education" className={`block text-sm font-medium text-gray-700 mb-2 p-1 rounded-md transition-colors duration-300 ${highlightClass('goal-label-education')}`}>
              What is your main goal for education after high school?
            </span>
            <div className="grid grid-cols-2 gap-3">
              {EDUCATION_GOAL_OPTIONS.map((option, index) => (
                 <button id={`goal-option-${index}`} key={option} type="button" onClick={() => setGoal(option)} className={`text-center p-3 border rounded-lg transition-all duration-200 text-sm ${goal === option ? 'border-[#A2C5AC] ring-2 ring-[#A2C5AC] bg-[#A2C5AC]/10' : 'border-gray-300 hover:border-[#878E99]'} ${highlightClass(`goal-option-${index}`)}`}>
                   {option}
                 </button>
              ))}
            </div>
          </div>
        );
      case 'independent_spin':
        return null;
      default:
        return null;
    }
  };
  
  const highlightClass = (id: string) => currentlyReading === id ? 'bg-[#A2C5AC]/20' : '';

  return (
    <>
    <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-10">
        <div className="flex justify-between items-start text-center mb-8">
            <div className="text-left">
                <h1 id="app-title" className={`text-3xl sm:text-4xl font-bold text-gray-800 p-1 rounded-md transition-colors duration-300 ${highlightClass('app-title')}`}>{APP_TITLE}</h1>
                <p id="app-subtitle" className={`text-gray-500 mt-2 p-1 rounded-md transition-colors duration-300 ${highlightClass('app-subtitle')}`}>AI-powered surveys for student success.</p>
            </div>
            <div className="flex items-center gap-2">
                {isTtsOn && (
                    <>
                    <button
                        onClick={handlePlayPause}
                        disabled={!isReadyToPlay}
                        className="text-gray-500 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100 transition-colors disabled:text-gray-300 disabled:cursor-not-allowed"
                        title={isPlaying ? 'Pause audio guide' : 'Play audio guide'}
                    >
                        {isFetchingCurrentAudio ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div> : isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} title="Audio settings" className="text-gray-500 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <SettingsIcon className="w-6 h-6" />
                    </button>
                    </>
                )}
                <button onClick={() => setIsTtsOn(prev => !prev)} title={isTtsOn ? 'Turn off audio guide' : 'Turn on audio guide'} className="text-gray-500 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100 transition-colors">
                    {isTtsOn ? <SpeakerOnIcon className="w-6 h-6" /> : <SpeakerOffIcon className="w-6 h-6" />}
                </button>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label id="name-label" htmlFor="name" className={`block text-sm font-medium text-gray-700 mb-1 p-1 rounded-md transition-colors duration-300 ${highlightClass('name-label')}`}>Student's Name</label>
            <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#A2C5AC] focus:border-[#A2C5AC]" placeholder="e.g., Alex Johnson" />
          </div>
          <div>
            <label id="grade-label" htmlFor="grade" className={`block text-sm font-medium text-gray-700 mb-1 p-1 rounded-md transition-colors duration-300 ${highlightClass('grade-label')}`}>Grade</label>
            <select id="grade" value={grade} onChange={e => setGrade(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#A2C5AC] focus:border-[#A2C5AC] bg-white">
                <option value="">Select Grade</option>
                {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label id="teacher-label" htmlFor="teacher" className={`block text-sm font-medium text-gray-700 mb-1 p-1 rounded-md transition-colors duration-300 ${highlightClass('teacher-label')}`}>Teacher of Record</label>
            <select id="teacher" value={teacher} onChange={e => setTeacher(e.target.value)} disabled={!grade} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#A2C5AC] focus:border-[#A2C5AC] bg-white disabled:bg-gray-100 disabled:cursor-not-allowed">
              <option value="">{grade ? 'Select Teacher' : 'Select Grade First'}</option>
              {availableTeachers.map((t) => (
                <option key={t.email} value={JSON.stringify(t)}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <span id="survey-type-label" className={`block text-sm font-medium text-gray-700 mb-2 p-1 rounded-md transition-colors duration-300 ${highlightClass('survey-type-label')}`}>Survey Type</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {SURVEY_TYPES.map(type => (
                <button id={`survey-type-${type.value}`} key={type.value} type="button" onClick={() => setSurveyType(type.value)} className={`text-left p-4 border rounded-lg transition-all duration-200 ${surveyType === type.value ? 'border-[#A2C5AC] ring-2 ring-[#A2C5AC] bg-[#A2C5AC]/10' : 'border-gray-300 hover:border-[#878E99]'} ${highlightClass(`survey-type-${type.value}`)}`}>
                  <div className="flex items-center mb-2">{getIcon(type.value)} <span className="ml-3 font-semibold text-gray-800">{type.label}</span></div>
                  <p className="text-xs text-gray-500">{type.description}</p>
                </button>
              ))}
            </div>
          </div>
          
          {renderGoalInput()}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button id="start-button" type="submit" className={`w-full bg-[#A2C5AC] text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-[#9DB5B2] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A2C5AC] text-lg ${highlightClass('start-button')}`}>
            Start Survey
          </button>
        </form>
      </div>
    </div>
    </>
  );
};

export default StartScreen;