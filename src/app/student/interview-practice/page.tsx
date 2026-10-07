'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Loader2,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  Award,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

import { PageHeader } from '@/components/design-system';
import {
  getAdaptiveQuestionBank,
  InterviewFeedback,
  InterviewFinalReport,
  InterviewRound,
  InterviewCategory,
} from '@/domain/interview-simulator';

const SCHOLARSHIPS = [
  { name: 'Gamuda Scholarship', provider: 'Gamuda Berhad' },
  { name: 'Petronas Education Sponsorship (PESP)', provider: 'PETRONAS' },
  { name: 'Yayasan Khazanah Global Scholarship', provider: 'Yayasan Khazanah' },
  { name: 'Bank Negara Kijang Scholarship', provider: 'Bank Negara Malaysia' },
  { name: 'JPA Program Ijazah Dalam Negara (PIDN)', provider: 'Jabatan Perkhidmatan Awam' },
];

const TOTAL_QUESTIONS = 5;

export default function InterviewPracticePage() {
  const [selectedScholarship, setSelectedScholarship] = useState(SCHOLARSHIPS[0]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [stage, setStage] = useState<'answering' | 'reviewing' | 'completed'>('answering');
  const [currentQuestion, setCurrentQuestion] = useState(
    getAdaptiveQuestionBank(SCHOLARSHIPS[0].name)[0].question
  );
  const [currentCategory, setCurrentCategory] = useState<InterviewCategory>('introduction');
  const [inputAnswer, setInputAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef<boolean>(false);
  const baseTextRef = useRef<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);

  // Current round feedback & history
  const [currentFeedback, setCurrentFeedback] = useState<InterviewFeedback | null>(null);
  const [rounds, setRounds] = useState<InterviewRound[]>([]);
  const [askedQuestions, setAskedQuestions] = useState<string[]>([
    getAdaptiveQuestionBank(SCHOLARSHIPS[0].name)[0].question,
  ]);
  const [finalReport, setFinalReport] = useState<InterviewFinalReport | null>(null);

  // Restore session from sessionStorage on client mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = sessionStorage.getItem('dreampath_interview_sim_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.scholarshipName) {
            const matched = SCHOLARSHIPS.find((s) => s.name === parsed.scholarshipName) || SCHOLARSHIPS[0];
            setSelectedScholarship(matched);
          }
          if (parsed.currentQuestionIndex) setCurrentQuestionIndex(parsed.currentQuestionIndex);
          if (parsed.stage) setStage(parsed.stage);
          if (parsed.currentQuestion) setCurrentQuestion(parsed.currentQuestion);
          if (parsed.currentCategory) setCurrentCategory(parsed.currentCategory);
          if (parsed.currentFeedback) setCurrentFeedback(parsed.currentFeedback);
          if (Array.isArray(parsed.rounds)) setRounds(parsed.rounds);
          if (Array.isArray(parsed.askedQuestions)) setAskedQuestions(parsed.askedQuestions);
          if (parsed.finalReport) setFinalReport(parsed.finalReport);
        }
      } catch {
        // ignore
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Save state to sessionStorage
  useEffect(() => {
    try {
      const dataToSave = {
        scholarshipName: selectedScholarship.name,
        currentQuestionIndex,
        stage,
        currentQuestion,
        currentCategory,
        currentFeedback,
        rounds,
        askedQuestions,
        finalReport,
      };
      sessionStorage.setItem('dreampath_interview_sim_session', JSON.stringify(dataToSave));
    } catch {
      // ignore
    }
  }, [
    selectedScholarship,
    currentQuestionIndex,
    stage,
    currentQuestion,
    currentCategory,
    currentFeedback,
    rounds,
    askedQuestions,
    finalReport,
  ]);

  // Stop media stream tracks cleanly
  const stopMediaStream = () => {
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      mediaStreamRef.current = null;
    }
  };

  // Cleanup recognition and media recording on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      stopMediaStream();
    };
  }, []);

  // Multi-tier Voice Dictation: words appear in the text field in real time as the user speaks
  const toggleVoiceRecording = async () => {
    if (typeof window === 'undefined') return;

    // IF ALREADY RECORDING: STOP RECORDING
    if (isRecording || isRecordingRef.current) {
      isRecordingRef.current = false;
      setIsRecording(false);
      setInterimTranscript('');

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      } else {
        stopMediaStream();
      }
      return;
    }

    // STARTING VOICE INPUT
    setVoiceError(null);
    setInterimTranscript('');
    audioChunksRef.current = [];
    baseTextRef.current = inputAnswer;

    // 1. Verify mediaDevices capability
    if (!navigator?.mediaDevices?.getUserMedia) {
      setVoiceError(
        'Microphone access is not supported by your browser or connection. Please use a secure connection (HTTPS / localhost) or type your response directly.'
      );
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // 2. Request mic permission explicitly - PROMPTS BROWSER FOR PERMISSION
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      const errName = err?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setVoiceError(
          'Microphone permission was denied. Please allow microphone access in your browser address bar to speak your response.'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setVoiceError('No microphone could be detected on your device. Please plug in a microphone or type your response.');
      } else {
        setVoiceError(`Microphone access notice (${err?.message || 'unknown'}). You can type your response directly.`);
      }
      return;
    }

    // PRIMARY PATH: Browser has Web Speech API (Chrome, Edge, Safari) -> Live Real-Time Dictation
    if (SpeechRecognition) {
      // Release getUserMedia audio track so SpeechRecognition has full exclusive access to the microphone hardware!
      if (stream) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
      }

      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsRecording(true);
          isRecordingRef.current = true;
          setVoiceError(null);
        };

        recognition.onresult = (event: any) => {
          let sessionFinal = '';
          let sessionInterim = '';

          for (let i = 0; i < event.results.length; ++i) {
            const item = event.results[i];
            if (item.isFinal) {
              sessionFinal += item[0].transcript + ' ';
            } else {
              sessionInterim += item[0].transcript;
            }
          }

          const currentSpoken = `${sessionFinal}${sessionInterim}`.trim();
          const base = baseTextRef.current ? baseTextRef.current.trim() : '';
          const fullText = base ? `${base} ${currentSpoken}` : currentSpoken;

          // LIVE UPDATE INTO THE TEXT FIELD AS YOU TALK!
          setInputAnswer(fullText);
          setInterimTranscript(sessionInterim || currentSpoken);
        };

        recognition.onerror = (event: any) => {
          const code = event?.error;
          if (code === 'no-speech') {
            return;
          }
          if (code === 'not-allowed' || code === 'service-not-allowed') {
            setVoiceError('Microphone permission was denied. Please allow microphone access in your browser.');
            isRecordingRef.current = false;
            setIsRecording(false);
            return;
          }
          console.warn('[SpeechRecognition] notice:', code);
        };

        recognition.onend = () => {
          // If still marked as recording, keep continuous listening active
          if (isRecordingRef.current) {
            try {
              recognition.start();
            } catch {
              // ignore
            }
          }
        };

        recognition.start();
        isRecordingRef.current = true;
        setIsRecording(true);
        return;
      } catch (speechErr: any) {
        console.warn('SpeechRecognition initialization warning, falling back to MediaRecorder:', speechErr);
      }
    }

    // FALLBACK PATH: Web Speech API unavailable (Firefox / Brave) -> MediaRecorder
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        return;
      }
    }
    mediaStreamRef.current = stream;

    let chosenMimeType = 'audio/webm';
    if (typeof MediaRecorder !== 'undefined') {
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/wav',
      ];
      for (const c of candidates) {
        if (MediaRecorder.isTypeSupported(c)) {
          chosenMimeType = c;
          break;
        }
      }
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, chosenMimeType ? { mimeType: chosenMimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stopMediaStream();

        const chunks = audioChunksRef.current;
        if (!chunks || chunks.length === 0) return;

        const audioBlob = new Blob(chunks, { type: chosenMimeType });
        if (audioBlob.size < 1200) return;

        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              const dataUrl = reader.result as string;
              const base64Data = dataUrl.split(',')[1] || '';
              resolve(base64Data);
            };
            reader.onerror = reject;
          });
          reader.readAsDataURL(audioBlob);
          const audioBase64 = await base64Promise;

          if (audioBase64) {
            const res = await fetch('/api/ai/interview', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'transcribe_audio',
                audioBase64,
                mimeType: chosenMimeType,
              }),
            });

            const data = await res.json();
            if (data.transcription && data.transcription.trim()) {
              const spokenText = data.transcription.trim();
              const base = baseTextRef.current ? baseTextRef.current.trim() : '';
              setInputAnswer(base ? `${base} ${spokenText}` : spokenText);
              setVoiceError(null);
            }
          }
        } catch (transcribeErr: any) {
          console.warn('[Voice Dictation] AI transcription warning:', transcribeErr);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start(250);
      isRecordingRef.current = true;
      setIsRecording(true);
    } catch (recErr) {
      console.warn('MediaRecorder error:', recErr);
    }
  };

  /**
   * 1. Submit Answer -> Evaluates answer honestly -> Displays review (does NOT fetch next question yet)
   */
  const handleSendAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputAnswer.trim() || isSubmitting) return;

    const userText = inputAnswer.trim();
    setIsSubmitting(true);

    try {
      const questionHistory = [
        ...rounds.flatMap((r) => [
          { role: 'interviewer' as const, content: r.question },
          { role: 'student' as const, content: r.answer || '' },
        ]),
        { role: 'interviewer' as const, content: currentQuestion },
        { role: 'student' as const, content: userText },
      ];

      const evalRes = await fetch('/api/ai/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate_answer',
          scholarshipName: selectedScholarship.name,
          providerName: selectedScholarship.provider,
          questionHistory,
          currentAnswer: userText,
          askedQuestions,
          rounds,
        }),
      });

      const evalData = await evalRes.json();
      const feedback: InterviewFeedback = evalData.feedback || {
        clarityScore: 7,
        structureScore: 7,
        starMethodUsed: false,
        overallAssessment:
          'Your answer was received and reviewed by the panel. Strengthen your response by citing concrete results and connecting back to the sponsor values.',
        strengths: ['Direct response to the prompt', 'Courteous and clear tone'],
        improvements: ['Quantify outcomes with numbers or timeframes', 'Use the STAR format explicitly'],
        interviewerImpression: 'The panel finds your potential sincere but seeks deeper empirical evidence.',
        improvementGuidance: 'Give a specific real-world example highlighting the exact action you took.',
      };

      setCurrentFeedback(feedback);

      // Save round
      const updatedRound: InterviewRound = {
        questionNumber: currentQuestionIndex,
        category: currentCategory,
        question: currentQuestion,
        answer: userText,
        feedback,
      };

      setRounds((prev) => [...prev, updatedRound]);
      setStage('reviewing');
    } catch {
      // fallback feedback
      const fallbackFeedback: InterviewFeedback = {
        clarityScore: 7,
        structureScore: 7,
        starMethodUsed: false,
        overallAssessment:
          'Your answer was recorded. Focus on incorporating quantifiable results and concrete project experiences.',
        strengths: ['Addressed the main question prompt', 'Professional demeanor'],
        improvements: ['Include quantifiable metrics', 'Relate aspirations back to the provider'],
        interviewerImpression: 'A solid initial answer that would benefit from more concrete proof points.',
        improvementGuidance: 'Highlight specific outcomes you achieved in your studies or extracurriculars.',
      };
      setCurrentFeedback(fallbackFeedback);
      setRounds((prev) => [
        ...prev,
        {
          questionNumber: currentQuestionIndex,
          category: currentCategory,
          question: currentQuestion,
          answer: userText,
          feedback: fallbackFeedback,
        },
      ]);
      setStage('reviewing');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 2. Continue Interview -> Fetches the NEXT UNIQUE question only AFTER review is read
   */
  const handleContinueInterview = async () => {
    if (isLoadingNext) return;

    // Check if reached max questions: proceed to final evaluation
    if (currentQuestionIndex >= TOTAL_QUESTIONS) {
      await handleCompleteInterview();
      return;
    }

    setIsLoadingNext(true);

    try {
      const questionHistory = rounds.flatMap((r) => [
        { role: 'interviewer' as const, content: r.question },
        { role: 'student' as const, content: r.answer || '' },
      ]);

      const lastAnswer = rounds[rounds.length - 1]?.answer || '';

      const nextQRes = await fetch('/api/ai/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'next_question',
          scholarshipName: selectedScholarship.name,
          providerName: selectedScholarship.provider,
          questionHistory,
          askedQuestions,
          currentAnswer: lastAnswer,
          rounds,
        }),
      });

      const nextQData = await nextQRes.json();
      const nextQ =
        nextQData.nextQuestion ||
        `Looking forward, how will your academic achievements enable you to contribute to Malaysia's development?`;

      // Update session state
      setCurrentQuestion(nextQ);
      setCurrentCategory(nextQData.category || 'project_experience');
      setAskedQuestions((prev) => [...prev, nextQ]);
      setCurrentQuestionIndex((prev) => prev + 1);
      setInputAnswer('');
      setCurrentFeedback(null);
      setStage('answering');
    } catch {
      // fallback
      const nextBankQ =
        getAdaptiveQuestionBank(selectedScholarship.name)[currentQuestionIndex]?.question ||
        `Where do you see yourself five years post-graduation within Malaysia's developing economy?`;

      setCurrentQuestion(nextBankQ);
      setAskedQuestions((prev) => [...prev, nextBankQ]);
      setCurrentQuestionIndex((prev) => prev + 1);
      setInputAnswer('');
      setCurrentFeedback(null);
      setStage('answering');
    } finally {
      setIsLoadingNext(false);
    }
  };

  /**
   * 3. End of interview -> Produces final overall evaluation report
   */
  const handleCompleteInterview = async () => {
    setIsLoadingNext(true);
    try {
      const res = await fetch('/api/ai/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'final_evaluation',
          scholarshipName: selectedScholarship.name,
          providerName: selectedScholarship.provider,
          rounds,
        }),
      });
      const data = await res.json();
      if (data.finalReport) {
        setFinalReport(data.finalReport);
      }
      setStage('completed');
    } catch {
      setStage('completed');
    } finally {
      setIsLoadingNext(false);
    }
  };

  /**
   * Reset session completely
   */
  const resetInterview = (scholarship = selectedScholarship) => {
    setSelectedScholarship(scholarship);
    const initialQuestion = getAdaptiveQuestionBank(scholarship.name)[0].question;
    setCurrentQuestionIndex(1);
    setCurrentQuestion(initialQuestion);
    setCurrentCategory('introduction');
    setCurrentFeedback(null);
    setRounds([]);
    setAskedQuestions([initialQuestion]);
    setFinalReport(null);
    setInputAnswer('');
    setStage('answering');

    // Clean up any ongoing recording or transcription
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    stopMediaStream();
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
    setIsRecording(false);
    setIsTranscribing(false);
    setVoiceError(null);

    try {
      sessionStorage.removeItem('dreampath_interview_sim_session');
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Student Workspace', href: '/student' },
          { label: 'Interview Simulator' },
        ]}
        eyebrow="Scholarship Preparation Simulator"
        title="Mock Interview Practice"
        subtitle="Roleplay with an AI scholarship interview panel. Get real-time feedback on clarity, STAR framework structure, and answer impact."
        actions={
          <button
            type="button"
            onClick={() => resetInterview()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Session</span>
          </button>
        }
      />

      {/* Target Scholarship Selection */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Target Interview Panel:
          </label>
          <select
            value={selectedScholarship.name}
            onChange={(e) => {
              const matched = SCHOLARSHIPS.find((s) => s.name === e.target.value);
              if (matched) resetInterview(matched);
            }}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 cursor-pointer"
          >
            {SCHOLARSHIPS.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.provider})
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            Panel active: <strong className="text-slate-900">{selectedScholarship.provider}</strong>
          </span>
        </div>
      </div>

      {/* Interview Dialogue Box */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">
              Mock Panel Stream — {selectedScholarship.name}
            </span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-full border border-blue-200/60">
              {stage === 'completed' ? 'Interview Completed' : `Question ${currentQuestionIndex} of ${TOTAL_QUESTIONS}`}
            </span>
          </div>
          <span className="text-slate-400 font-mono text-[11px] font-semibold">
            {rounds.length} answers evaluated
          </span>
        </div>

        {/* Previous Completed Rounds (Scrollable history) */}
        {rounds.length > 0 && stage !== 'completed' && (
          <div className="space-y-4 max-h-72 overflow-y-auto pr-1 border-b border-slate-100 pb-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Previous Interview Rounds
            </p>
            {rounds.slice(0, currentQuestionIndex - 1).map((r, idx) => (
              <div key={idx} className="space-y-2 border-l-2 border-slate-200 pl-3">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase mb-1">
                    Question {r.questionNumber} of {TOTAL_QUESTIONS}
                  </span>
                  <p>{r.question}</p>
                </div>
                {r.answer && (
                  <div className="p-3 bg-blue-50/50 border border-blue-200/70 rounded-xl text-xs text-slate-900 ml-4">
                    <span className="text-[10px] font-bold text-blue-700 block uppercase mb-1">
                      Your Response
                    </span>
                    <p className="whitespace-pre-wrap">{r.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Current Active Round (when not completed) */}
        {stage !== 'completed' && (
          <div className="space-y-4">
            {/* Current Panel Question */}
            <div className="p-4.5 rounded-xl text-xs leading-relaxed bg-slate-50 border border-slate-200/90 text-slate-800 shadow-2xs">
              <div className="flex items-center justify-between mb-2 text-[11px] font-bold tracking-wide">
                <span className="text-slate-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                  Official Panel Question • Question {currentQuestionIndex} of {TOTAL_QUESTIONS}
                </span>
                <span className="text-slate-400 font-mono text-[10px]">
                  Mock Panel Coach
                </span>
              </div>
              <p className="text-slate-900 text-sm font-medium leading-relaxed">
                {currentQuestion}
              </p>
            </div>

            {/* In 'reviewing' stage: show student's submitted answer */}
            {stage === 'reviewing' && rounds[rounds.length - 1]?.answer && (
              <div className="p-4 rounded-xl text-xs leading-relaxed bg-blue-50/60 border border-blue-200/90 text-slate-900 ml-4 sm:ml-8 animate-in fade-in duration-150">
                <div className="flex items-center justify-between mb-1.5 text-[11px] font-bold tracking-wide">
                  <span className="text-blue-700 uppercase text-[10px] tracking-wider font-bold">
                    Your Response
                  </span>
                </div>
                <p className="whitespace-pre-wrap font-normal leading-relaxed">
                  {rounds[rounds.length - 1].answer}
                </p>
              </div>
            )}

            {/* Loading indicator during evaluation */}
            {isSubmitting && (
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600 flex items-center gap-2 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Evaluating your response against panel rubrics...</span>
              </div>
            )}

            {/* Live Honest Answer Feedback Card */}
            {stage === 'reviewing' && currentFeedback && (
              <div className="p-5 bg-emerald-50/70 border border-emerald-200/90 rounded-xl space-y-4 text-xs animate-in fade-in duration-150">
                {/* Header & Scores */}
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Panel Evaluation Feedback
                  </span>
                  <div className="flex items-center gap-3 font-mono text-[11px] font-bold text-emerald-900">
                    <span className="bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      Clarity: {currentFeedback.clarityScore}/10
                    </span>
                    <span className="bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      Structure: {currentFeedback.structureScore}/10
                    </span>
                    {currentFeedback.starMethodUsed && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                        STAR Applied
                      </span>
                    )}
                  </div>
                </div>

                {/* Overall Assessment */}
                {currentFeedback.overallAssessment && (
                  <div className="text-emerald-950 leading-relaxed font-medium bg-white/70 p-3 rounded-lg border border-emerald-200/50">
                    <strong className="block text-[11px] uppercase tracking-wider text-emerald-900 mb-1 font-bold">
                      Overall Assessment:
                    </strong>
                    <p>{currentFeedback.overallAssessment}</p>
                  </div>
                )}

                {/* Key Strengths (2-4 points) */}
                {currentFeedback.strengths && currentFeedback.strengths.length > 0 && (
                  <div>
                    <strong className="text-emerald-900 block text-[11px] uppercase tracking-wider mb-1.5 font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      What You Did Well:
                    </strong>
                    <ul className="list-disc list-inside text-emerald-950 space-y-1 font-medium pl-1">
                      {currentFeedback.strengths.map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Refinement Opportunities (2-4 points) */}
                {currentFeedback.improvements && currentFeedback.improvements.length > 0 && (
                  <div>
                    <strong className="text-amber-950 block text-[11px] uppercase tracking-wider mb-1.5 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      What Could Be Improved:
                    </strong>
                    <ul className="list-disc list-inside text-amber-900 space-y-1 font-medium pl-1">
                      {currentFeedback.improvements.map((imp: string, i: number) => (
                        <li key={i}>{imp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Interviewer's Impression */}
                {currentFeedback.interviewerImpression && (
                  <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200/70 text-slate-800">
                    <strong className="block text-[11px] uppercase tracking-wider text-slate-700 mb-1 font-bold flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                      Interviewer&apos;s Impression:
                    </strong>
                    <p className="leading-relaxed">{currentFeedback.interviewerImpression}</p>
                  </div>
                )}

                {/* Practical Improvement Guidance */}
                {currentFeedback.improvementGuidance && (
                  <div className="text-slate-700 leading-relaxed">
                    <strong className="block text-[11px] uppercase tracking-wider text-slate-900 mb-1 font-bold">
                      How to Make It Stronger:
                    </strong>
                    <p>{currentFeedback.improvementGuidance}</p>
                  </div>
                )}

                {/* Suggested Model Phrasing (if provided) */}
                {currentFeedback.sampleBetterAnswer && (
                  <div className="p-3.5 bg-white border border-emerald-200/90 rounded-xl text-slate-700 mt-2 shadow-2xs">
                    <strong className="text-slate-900 block text-[11px] mb-1 font-bold">
                      Suggested Direction / Phrasing Example:
                    </strong>
                    <p className="italic text-slate-600 text-xs leading-relaxed">
                      &ldquo;{currentFeedback.sampleBetterAnswer}&rdquo;
                    </p>
                  </div>
                )}

                {/* Continue Interview Button (Transitions only after student reviews) */}
                <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleContinueInterview}
                    disabled={isLoadingNext}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingNext ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Preparing Next Question...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {currentQuestionIndex < TOTAL_QUESTIONS
                            ? `Continue Interview (Question ${currentQuestionIndex + 1} of ${TOTAL_QUESTIONS})`
                            : 'View Final Interview Evaluation'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Answer Input Area (Only active during 'answering' stage) */}
            {stage === 'answering' && (
              <form onSubmit={handleSendAnswer} className="space-y-3 pt-3 border-t border-slate-100">
                {voiceError && (
                  <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{voiceError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVoiceError(null)}
                      className="text-amber-800 hover:text-amber-950 font-bold text-[11px] underline cursor-pointer shrink-0"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {isRecording && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center gap-2.5 text-xs text-rose-900 animate-in fade-in duration-150">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                    </span>
                    <span className="font-medium flex-1">
                      {interimTranscript ? (
                        <span>Live dictation: &ldquo;{interimTranscript}&rdquo;</span>
                      ) : (
                        <span>Listening... Start speaking — your words will appear live in the text box below. Click &ldquo;Stop Dictation&rdquo; when finished.</span>
                      )}
                    </span>
                  </div>
                )}

                {isTranscribing && (
                  <div className="p-2.5 bg-blue-50 border border-blue-200/80 rounded-xl flex items-center gap-2.5 text-xs text-blue-900 animate-in fade-in duration-150">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                    <span className="font-medium">Transcribing your voice response with AI...</span>
                  </div>
                )}

                <div>
                  <textarea
                    rows={4}
                    value={inputAnswer}
                    onChange={(e) => setInputAnswer(e.target.value)}
                    placeholder="Type your response using the STAR method (Situation, Task, Action, Result)... Mention concrete examples, project names, and specific achievements."
                    disabled={isSubmitting || isTranscribing}
                    className="w-full p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 placeholder:text-slate-400 leading-relaxed resize-y font-normal"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={toggleVoiceRecording}
                    disabled={isTranscribing}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                      isRecording
                        ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs'
                        : isTranscribing
                        ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
                    }`}
                  >
                    {isRecording ? (
                      <MicOff className="w-4 h-4 text-rose-600" />
                    ) : isTranscribing ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    ) : (
                      <Mic className="w-4 h-4 text-slate-500" />
                    )}
                    <span>{isRecording ? 'Stop Dictation' : isTranscribing ? 'Transcribing...' : 'Voice Input'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || isTranscribing || !inputAnswer.trim()}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Answer</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* End-of-Interview Comprehensive Final Evaluation Report */}
        {stage === 'completed' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="p-6 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/70 text-blue-700 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">
                      Overall Interview Performance Report
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Mock Panel Evaluation for {selectedScholarship.name} ({selectedScholarship.provider})
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200/70 text-slate-700 px-2.5 py-1 rounded-full">
                  Practice Session Completed
                </span>
              </div>

              {/* Overall performance summary */}
              <div className="p-4 bg-white rounded-xl border border-slate-200/70 text-xs text-slate-800 leading-relaxed">
                <strong className="block text-[11px] uppercase tracking-wider text-slate-900 mb-1 font-bold">
                  Executive Performance Summary:
                </strong>
                <p>
                  {finalReport?.overallPerformance ||
                    `You successfully completed all ${TOTAL_QUESTIONS} rounds of the mock scholarship interview. You exhibited genuine interest and strong commitment to your field of study.`}
                </p>
              </div>

              {/* Strongest Areas & Areas to Improve */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-xl border border-slate-200/70 text-xs space-y-2">
                  <strong className="text-emerald-950 block text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Strongest Areas:
                  </strong>
                  <ul className="list-disc list-inside text-slate-700 space-y-1 font-medium">
                    {(
                      finalReport?.strongestAreas || [
                        'Demonstrated authentic academic passion',
                        'Structured narrative delivery',
                        'Clear polite demeanor throughout',
                      ]
                    ).map((area, i) => (
                      <li key={i}>{area}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200/70 text-xs space-y-2">
                  <strong className="text-amber-950 block text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Key Areas to Improve:
                  </strong>
                  <ul className="list-disc list-inside text-slate-700 space-y-1 font-medium">
                    {(
                      finalReport?.areasToImprove || [
                        'Quantify accomplishments with concrete numbers and timelines',
                        'Deepen knowledge of the sponsor foundation’s core initiatives',
                        'Keep answers focused to avoid preamble',
                      ]
                    ).map((area, i) => (
                      <li key={i}>{area}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Rubric Evaluation Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Communication
                  </span>
                  <span className="font-bold text-slate-900">
                    {finalReport?.communicationRating || 'Clear & Developing'}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Answer Quality
                  </span>
                  <span className="font-bold text-slate-900">
                    {finalReport?.answerQuality || 'Structured & Thoughtful'}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Professionalism
                  </span>
                  <span className="font-bold text-slate-900">
                    {finalReport?.professionalism || 'High — respectful & authentic'}
                  </span>
                </div>
              </div>

              {/* Recommended Practice Areas */}
              <div className="p-4 bg-white rounded-xl border border-slate-200/70 text-xs space-y-2">
                <strong className="text-slate-900 block text-[11px] uppercase tracking-wider font-bold">
                  Recommended Practice Areas Before Your Official Panel:
                </strong>
                <ul className="list-disc list-inside text-slate-700 space-y-1 font-medium">
                  {(
                    finalReport?.recommendedPracticeAreas || [
                      'Prepare 3 go-to signature stories (1 technical project, 1 teamwork conflict, 1 personal setback) using the STAR framework',
                      'Review the sponsor’s official sustainability or corporate impact report to cite specific ongoing initiatives',
                      'Practice timed 90-second responses aloud to build concise delivery under panel scrutiny',
                    ]
                  ).map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>

              {/* Practice Disclaimer */}
              <div className="p-3 bg-slate-100/70 rounded-xl text-[11px] text-slate-500 flex items-start gap-2 border border-slate-200/50">
                <span className="font-bold text-slate-700 shrink-0">Practice Simulator Note:</span>
                <span>
                  This session is an AI mock interview practice tool designed to strengthen your personal articulation and STAR structure. It does not represent an official assessment by {selectedScholarship.provider} or guarantee scholarship selection.
                </span>
              </div>

              {/* Restart button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => resetInterview()}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Start Another Practice Session</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
