import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import RNVideo from 'react-native-video';
import Orientation from 'react-native-orientation-locker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ImageBackground } from 'react-native';
import { getVideoSource } from './src/constants/videoSources';
import { UI_ASSETS, getOptionImage } from './src/constants/uiAssets';
import { QUESTIONS } from './src/constants/questions';

// V, UI, QUESTIONS now imported from constants - cleaner main file!

const { width: SW, height: SH } = (() => {
  const { width, height } = Dimensions.get('window');
  return { width: Math.max(width, height), height: Math.min(width, height) };
})();

// Responsive Font Helper
const rf = (size: number) => {
  const standardWidth = 812; // Base scale for landscape
  return Math.round((size * SW) / standardWidth);
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase =
  | 'home'
  | 'opening'
  | 'welcome'
  | 'questionVideo'
  | 'options'
  | 'resultVideo'
  | 'score'
  | 'cancel'
  | 'exitVideo';

const TIMER_SECONDS = 60;

// ─── Component ────────────────────────────────────────────────────────────────
const VideoQuiz = () => {
  const [isResuming, setIsResuming] = useState(false);
  const [showScoreUI, setShowScoreUI] = useState(false);
  const [phase, setPhase] = useState<Phase>('opening');
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [paused, setPaused] = useState(false);
  const [debugPhase, setDebugPhase] = useState<Phase | null>(null); // DEBUG MODE
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPhaseRef = useRef<Phase>('opening');

  // Use debug phase if set, otherwise use actual phase
  const displayPhase = debugPhase || phase;
  const displayLastCorrect =
    debugPhase === 'resultVideo' ? lastCorrect : lastCorrect;
  const displayShowResult = debugPhase === 'resultVideo' ? true : showResult;

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  const stopQuestion = useCallback(() => {
    if (questionRef.current) {
      clearTimeout(questionRef.current);
      questionRef.current = null;
    }
  }, []);
  const [cancelTime, setCancelTime] = useState(60);
  const cancelTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    stopTimer();
    setTimeLeft(TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setLastCorrect(false);
          // setScore(s => s + 2);
          // setVideoKey(k => k + 1);
          setPhase('resultVideo');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [stopTimer]);
  useEffect(() => {
    if (phase === 'cancel') {
      setCancelTime(60);

      cancelTimerRef.current = setInterval(() => {
        setCancelTime(t => {
          if (t <= 1) {
            clearInterval(cancelTimerRef.current!);
            cancelTimerRef.current = null;

            onContinueQuiz(); // ✅ use SAME function
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }

    return () => {
      if (cancelTimerRef.current) {
        clearInterval(cancelTimerRef.current);
        cancelTimerRef.current = null;
      }
    };
  }, [phase]);

  // lock to landscape always
  useEffect(() => {
    Orientation.lockToLandscape();
    StatusBar.setHidden(true);
    return () => {
      Orientation.unlockAllOrientations();
      StatusBar.setHidden(false);
    };
  }, []);
  useEffect(() => {
    if (phase === 'score') {
      setShowScoreUI(false); // hide initially
    }
  }, [phase]);

  // exit app on back press from home/opening screen
  useEffect(() => {
    if (phase !== 'home' && phase !== 'opening' && phase !== 'welcome') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });
    return () => sub.remove();
  }, [phase]);

  // show options/results after video ends
  useEffect(() => {
    if (phase === 'questionVideo') {
      setShowQuestion(false);
      setShowOptions(false);
      setSelectedOption(null);
      setPaused(false);
    } else if (phase === 'resultVideo') {
      setShowResult(false);
      setPaused(false);
    } else {
      stopQuestion();
    }
    return () => stopQuestion();
  }, [phase, stopQuestion]);

  // when options phase starts: show options+submit+timer
  useEffect(() => {
    if (phase === 'options') {
      setShowOptions(true);
      startTimer();
    } else {
      stopTimer();
    }
  }, [phase, startTimer, stopTimer]);

  // cleanup on unmount
  useEffect(
    () => () => {
      stopTimer();
      stopQuestion();
    },
    [stopTimer, stopQuestion],
  );

  // batch phase + key change in one setState to avoid double render
  const goTo = useCallback((nextPhase: Phase, nextIndex?: number) => {
    setPhase(nextPhase);
    if (nextIndex !== undefined) setQIndex(nextIndex);
  }, []);

  const onStartQuiz = useCallback(() => goTo('opening'), [goTo]);
  const onWelcomeImageClick = useCallback(() => goTo('questionVideo'), [goTo]);
  const onExitApp = useCallback(() => BackHandler.exitApp(), []);

  // ── current video source ──
  const videoSource = getVideoSource(phase, qIndex, lastCorrect, score);

  // ── handlers ──
  const onVideoEnd = useCallback(() => {
    if (phase === 'opening') {
      setQIndex(0);
      goTo('welcome');
    } else if (phase === 'questionVideo') {
      setIsResuming(false);
      setPhase('options'); // ✅ go to options properly
    } else if (phase === 'resultVideo') {
      setShowResult(true);
    } else if (phase === 'score') {
      setShowScoreUI(true);
    } else if (phase === 'exitVideo') {
      BackHandler.exitApp(); // ✅ EXIT AFTER VIDEO
    }
  }, [phase, qIndex, goTo]);
  // onSelectOption now only highlights, does NOT submit
  const onSelectOption = useCallback((optionIndex: number) => {
    setSelectedOption(optionIndex);
  }, []);

  // submit button — use selected option, or correct if none selected
  const onSubmit = useCallback(() => {
    stopTimer();

    // ❗ if nothing selected → treat as WRONG
    if (selectedOption === null) {
      setLastCorrect(false);
      goTo('resultVideo');
      return;
    }

    // normal check
    const correct = selectedOption === QUESTIONS[qIndex].correctAnswer;

    setLastCorrect(correct);

    if (correct) {
      setScore(s => s + 2);
    }

    goTo('resultVideo');
  }, [selectedOption, qIndex, goTo, stopTimer]);
  const [isMuted, setIsMuted] = useState(false);
  const onCancelPress = useCallback(() => {
    prevPhaseRef.current = phase;

    stopTimer();
    stopQuestion();

    setPaused(true); // ✅ ADD THIS

    goTo('cancel');
  }, [phase, goTo, stopTimer, stopQuestion]);

  const onContinueQuiz = useCallback(() => {
    stopTimer();
    stopQuestion();

    if (cancelTimerRef.current) {
      clearInterval(cancelTimerRef.current);
      cancelTimerRef.current = null;
    }

    setIsResuming(true); // 🔥 IMPORTANT

    setSelectedOption(null);
    setShowOptions(false);
    setShowResult(false);
    setPaused(false);

    setPhase(prevPhaseRef.current);
  }, [stopTimer, stopQuestion]);
  const onExitQuiz = useCallback(() => {
    stopTimer();
    stopQuestion();

    if (cancelTimerRef.current) {
      clearInterval(cancelTimerRef.current);
      cancelTimerRef.current = null;
    }

    setPhase('exitVideo'); // ✅ PLAY VIDEO INSTEAD OF EXIT
  }, [stopTimer, stopQuestion]);
  const onNextResult = useCallback(() => {
    stopTimer();

    const next = qIndex + 1;

    if (next < QUESTIONS.length) {
      setQIndex(next);
      setPhase('questionVideo');
    } else {
      setPhase('score');
    }
  }, [qIndex, stopTimer]);
  // getOptionImage imported from uiAssets.ts - local definition removed
  const onRetakeQuiz = useCallback(() => {
    // 🔥 STOP EVERYTHING
    stopTimer();
    stopQuestion();

    if (cancelTimerRef.current) {
      clearInterval(cancelTimerRef.current);
      cancelTimerRef.current = null;
    }

    // 🔥 RESET ALL STATES
    setScore(0);
    setQIndex(0);
    setSelectedOption(null);
    setLastCorrect(false);

    setShowOptions(false);
    setShowResult(false);
    setShowScoreUI(false);
    setPaused(false);

    // 🔥 GO TO OPENING
    setPhase('opening');
    setIsResuming(false);
  }, [stopTimer, stopQuestion]);
  const onFinishQuiz = useCallback(() => {
    stopTimer();
    stopQuestion();

    if (cancelTimerRef.current) {
      clearInterval(cancelTimerRef.current);
      cancelTimerRef.current = null;
    }

    setScore(0);
    setQIndex(0);
    setSelectedOption(null);
    setLastCorrect(false);
    setShowScoreUI(false);

    setPhase('home');
  }, [stopTimer, stopQuestion]);
  // ── render ──
  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom', 'left', 'right']}>
      {/* ── Video Player — always mounted, source swapped smoothly ── */}
      <RNVideo
        source={videoSource}
        style={s.video}
        resizeMode="cover"
        onEnd={onVideoEnd}
        muted={isMuted}
        controls={false}
        repeat={false}
        useTextureView={false}
        paused={
          phase === 'home' ||
          phase === 'cancel' ||
          (phase === 'resultVideo' && paused)
        }
        bufferConfig={{
          minBufferMs: 1000,
          maxBufferMs: 3000,
          bufferForPlaybackMs: 500,
          bufferForPlaybackAfterRebufferMs: 1000,
        }}
      />

      {/* ── Permanent header: logo + score + exit/audio (opening onwards, not home) ── */}
      <View style={s.permHeader} pointerEvents="box-none">
        <Image
          source={require('./assets/Doc_Talk.png')}
          style={s.logoImg}
          resizeMode="contain"
        />

        {/* SHOW ONLY AFTER START */}
        {phase !== 'home' && (
          <>
            {/* SCORE */}
            <View style={s.scorePill}>
              <Image
                source={UI_ASSETS.scoreBtn}
                style={s.scoreImg}
                resizeMode="contain"
              />
              <Text style={s.scoreText}>{score}</Text>
            </View>

            {/* AUDIO + EXIT */}
            <View style={s.headerRight}>
              <TouchableOpacity onPress={() => setIsMuted(prev => !prev)}>
                <Image
                  source={UI_ASSETS.audioBtn}
                  style={[s.topRightBtn, { opacity: isMuted ? 0.4 : 1 }]}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onCancelPress}
                disabled={phase === 'cancel' || phase === 'score'}
              >
                <Image source={UI_ASSETS.exitBtn} style={s.topRightBtn} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* ══════════════════════════════════════════════
                PHASE: options — left panel UI
            ══════════════════════════════════════════════ */}
      {phase === 'options' && showOptions && (
        <View style={s.overlay} pointerEvents="box-none">
          {/* Question panel + Options — shown after video ends */}
          <View style={s.leftPanel}>
            <Image
              source={UI_ASSETS.optionQ1}
              style={s.questionPanel}
              resizeMode="stretch"
            />
            <Text style={s.questionText}>{QUESTIONS[qIndex].questionText}</Text>
            {[
              UI_ASSETS.optionA,
              UI_ASSETS.optionB,
              UI_ASSETS.optionC,
              UI_ASSETS.optionD,
            ].map((img, i) => (
              <TouchableOpacity
                key={i}
                style={s.optionRow}
                onPress={() => onSelectOption(i)}
              >
                <Image
                  source={img}
                  style={s.optionImg}
                  resizeMode="contain" // ✅ MUST ADD
                />
                {selectedOption === i && <View style={s.optionBorder} />}

                <Text style={s.optionTextStyle}>
                  {QUESTIONS[qIndex].options[i]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Timer + Submit */}
          <View style={s.bottomLeft}>
            <Image
              source={UI_ASSETS.timeBtn}
              style={s.timeImg}
              resizeMode="contain"
            />
            <Text style={s.timerText}>
              {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
              {String(timeLeft % 60).padStart(2, '0')}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              s.bottomRight,
              { opacity: selectedOption === null ? 0.4 : 1 },
            ]}
            onPress={onSubmit}
            disabled={selectedOption === null}
          >
            <Image source={UI_ASSETS.submitBtn} style={s.submitImg} />
          </TouchableOpacity>
        </View>
      )}

      {/* ══════════════════════════════════════════════
                PHASE: resultVideo overlay — correct UI
            ══════════════════════════════════════════════ */}
      {displayPhase === 'resultVideo' &&
        displayLastCorrect &&
        displayShowResult && (
          <TouchableOpacity
            style={s.resultOverlay}
            activeOpacity={1}
            onPress={() => setPaused(p => !p)}
          >
            {/* Correct Answer banner — top center */}
            <View style={s.correctResultBg}>
              <Image
                source={UI_ASSETS.correctAnswer}
                style={[s.resultBanner]}
                resizeMode="contain"
              />
            </View>

            {/* Selected correct option panel — center left with answer text */}

            {/* Reason panel — bottom background */}
            <Image
              source={UI_ASSETS.reasonPanel}
              style={s.reasonPanel}
              resizeMode="contain"
            />

            {/* Explanation text on reason panel */}
            <Text style={s.explanationText}>
              {lastCorrect
                ? QUESTIONS[qIndex].correctExplanation
                : QUESTIONS[qIndex].incorrectExplanation}
            </Text>

            {/* Selected answer text */}
            <View style={s.selectedOptionBox}>
              <Image
                source={getOptionImage(QUESTIONS[qIndex].correctAnswer)}
                style={s.selectedOptionImg}
                resizeMode="contain"
              />

              {/* TEXT CENTERED */}
              <Text style={[s.centerOptionText, { left: '10%' }]}>
                {QUESTIONS[qIndex].options[QUESTIONS[qIndex].correctAnswer]}
              </Text>
            </View>

            {/* Next button — bottom right */}
            <TouchableOpacity style={s.nextBtnContainer} onPress={onNextResult}>
              <Image
                source={UI_ASSETS.nextBtn}
                style={s.nextBtn}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {paused && <Text style={s.pauseIcon}>⏸</Text>}
          </TouchableOpacity>
        )}

      {displayPhase === 'resultVideo' &&
        !displayLastCorrect &&
        displayShowResult && (
          <TouchableOpacity
            style={s.resultOverlay}
            activeOpacity={1}
            onPress={() => setPaused(p => !p)}
          >
            {/* Incorrect banner */}
            <View style={s.incorrectResultBg2}>
              <Image
                source={UI_ASSETS.incorrectAnswer}
                style={[s.resultBanner, { left: -6, top: -20 }]}
                resizeMode="contain"
              />
            </View>

            <View style={s.correctAnswerBox}>
              <Image
                source={getOptionImage(QUESTIONS[qIndex].correctAnswer)}
                style={s.correctAnswerImg}
                resizeMode="contain"
              />

              <Text style={[s.centerOptionText, { left: '12%' }]}>
                {QUESTIONS[qIndex].options[QUESTIONS[qIndex].correctAnswer]}
              </Text>
            </View>

            {/* Reason */}
            <Image
              source={UI_ASSETS.reasonPanel}
              style={[s.reasonPanel, { left: 34, width: 290, height: 110 }]}
              resizeMode="stretch"
            />

            <Text style={s.explanationText}>
              {QUESTIONS[qIndex].incorrectExplanation}
            </Text>

            {/* Correct text */}

            {/* Next */}
            <TouchableOpacity style={s.nextBtnContainer} onPress={onNextResult}>
              <Image
                source={UI_ASSETS.nextBtn}
                style={s.nextBtn}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      {/* ══════════════════════════════════════════════
                PHASE: cancel — quit panel overlay on paused video
            ══════════════════════════════════════════════ */}
      {phase === 'cancel' && (
        <View style={s.overlay} pointerEvents="box-none">
          <View style={s.dimBg} pointerEvents="none" />
          <View style={s.cancelBox} pointerEvents="box-none">
            <Image
              source={UI_ASSETS.cancelQuiz}
              style={s.cancel}
              resizeMode="contain"
            />
            <Image
              source={UI_ASSETS.quitPanel}
              style={s.cancelBg}
              resizeMode="contain"
            />
            <Image
              source={UI_ASSETS.hintPanel}
              style={s.cancelHint}
              resizeMode="contain"
            />
            <Image
              source={UI_ASSETS.signalBtn}
              style={s.cancelSignal}
              resizeMode="contain"
            />
            {/* <Image source={UI_ASSETS.timePanel}    style={s.cancelTime}     resizeMode="contain" /> */}
            <TouchableOpacity
              style={s.cancelContinueBtn}
              onPress={onContinueQuiz}
            >
              <Image
                source={UI_ASSETS.continueQuiz}
                style={[s.cancelActionImg, { left: 16, width: 160, bottom: 6 }]}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.cancelExitBtn}
              onPress={onExitQuiz}
              activeOpacity={0.7}
            >
              <Image
                source={UI_ASSETS.exitQuizBtn}
                style={s.cancelActionImg}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ══════════════════════════════════════════════
                PHASE: score — score screen UI
            ══════════════════════════════════════════════ */}
      {phase === 'score' && showScoreUI && (
        <View style={s.overlay} pointerEvents="box-none">
          {/* Background */}
          <Image
            source={UI_ASSETS.quizScore}
            style={s.finalScore}
            resizeMode="contain"
          />

          {/* Score */}
          <View style={s.scoreCountBox} pointerEvents="none">
            <Text style={s.scoreCountText}>{score}</Text>
          </View>

          {/* Badge based on score */}
          {score <= 3 && (
            <Image
              source={UI_ASSETS.consultDoctor}
              style={s.scoreBadge}
              resizeMode="contain"
            />
          )}

          {score > 3 && (
            <Image
              source={UI_ASSETS.goodAttempt}
              style={s.scoreBadge}
              resizeMode="contain"
            />
          )}

          {/* Retake */}
          <TouchableOpacity style={s.retakeBtn} onPress={onRetakeQuiz}>
            <Image
              source={UI_ASSETS.retake}
              style={s.retakeImg}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Finish */}
          <TouchableOpacity style={s.finishBtn} onPress={onFinishQuiz}>
            <Image
              source={UI_ASSETS.finish}
              style={s.finishImg}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      )}

      {/* ══════════════════════════════════════════════
                PHASE: home — Start Quiz / Exit
            ══════════════════════════════════════════════ */}
      {phase === 'home' && (
        <TouchableOpacity onPress={onStartQuiz}>
          <ImageBackground
            source={UI_ASSETS.welcome}
            style={s.homeOverlay}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}

      {/* ══════════════════════════════════════════════
                PHASE: welcome — Image after opening video
            ══════════════════════════════════════════════ */}
      {phase === 'welcome' && (
        <View style={s.overlay}>
          <TouchableOpacity
            onPress={onWelcomeImageClick}
            activeOpacity={0.8}
            style={s.welcomeOverlay}
          >
            <ImageBackground
              source={UI_ASSETS.welcome}
              style={{
                height: '92%',
                justifyContent: 'center',
                alignItems: 'center',
                width: '78%',
                left: '6%',
              }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default VideoQuiz;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  video: { ...StyleSheet.absoluteFill, left: SW * 0.02, right: SW * 0.04 },
  overlay: { ...StyleSheet.absoluteFill },
  fullImg: { width: SW, height: SH },

  // Options screen — left panel
  leftPanel: {
    position: 'absolute',
    left: 26,
    top: 0,
    bottom: 0,
    width: SW * 1,
    paddingHorizontal: 4,
    paddingTop: 50,
    paddingBottom: 60,
    justifyContent: 'space-between',
  },
  questionPanel: { width: '38%', height: SH * 0.14, marginBottom: 2 },
  optionRow: {
    width: '38%',
    height: SH * 0.14,

    justifyContent: 'center',
    alignItems: 'center',

    overflow: 'hidden', // 🔥 prevent visual overflow issues
  },

  optionImg: {
    width: '100%',
    height: '100%',
    left: 0,
  },
  optionBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 12,
    bottom: 0,
    width: '100%',
    borderWidth: 3,
    borderColor: '#fff',

    borderRadius: 14,
  },
  optionTap: { ...StyleSheet.absoluteFill },

  // Question and option text
  questionText: {
    position: 'absolute',
    width: '36%', // same as questionPanel
    height: SH * 0.14, // same as panel height
    top: 52, // align with panel
    left: 60, // align with panel

    textAlign: 'left',
    textAlignVertical: 'center', // 🔥 important

    color: '#fff',
    fontSize: rf(16), // Responsive 18
    fontWeight: 'bold',

    includeFontPadding: false,
  },
  optionTextStyle: {
    position: 'absolute',

    width: '100%',
    height: '100%',

    // textAlign: 'center',
    left: '10%',
    textAlignVertical: 'center', // 🔥 KEY LINE

    color: '#fff',
    fontSize: rf(14),
    fontWeight: '500',

    paddingHorizontal: 20, // prevent text touching edges
  },
  optionTextSelected: { color: '#FFD700' },

  // Permanent header (opening onwards)
  permHeader: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    zIndex: 99,
  },
  logoImg: { width: 140, height: 90, left: 18 },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 6, left: 240 },
  scoreImg: { width: 100, height: 90, right: 20 },
  scoreText: {
    color: '#fff',
    fontSize: rf(18),
    fontWeight: 'bold',
    right: 60,
    top: 6,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  topRightBtn: { width: 36, height: 38, right: 20 },
  helpBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e3a5f',
    borderWidth: 2,
    borderColor: '#c9a961',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpText: { color: '#c9a961', fontSize: 24, fontWeight: 'bold' },

  // Timer
  bottomLeft: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeImg: { width: SW * 0.18, height: 44 },
  timerText: {
    color: '#fff',
    fontSize: rf(20),
    fontWeight: 'bold',
    right: 100,
    top: 6,
  },
  bottomRight: { position: 'absolute', bottom: 10, right: 12 },
  submitImg: { width: SW * 0.22, height: 50, right: 40 },

  resultOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
  pauseIcon: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    fontSize: 48,
    color: 'rgba(255,255,255,0.8)',
  },
  correctResultBg: {
    position: 'absolute',
    top: SH * 0.12,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
  },
  resultBanner: { width: SW * 0.48, height: 58, top: 8, right: 284 },
  correctSubtext: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  selectedOptionBox: {
    position: 'absolute',
    top: SH * 0.32,
    left: SW * 0.04,
    width: SW * 0.36,
    height: SH * 0.14,
  },
  selectedOptionImg: {
    width: '100%',
    height: '100%', // 🔥 IMPORTANT
  },
  optionLabelBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    paddingTop: 8,
    flex: 1,
  },
  optionLetter: {
    color: '#c9a961',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  reasonPanel: {
    position: 'absolute',
    bottom: SH * 0.12,
    width: SW * 0.4,
    height: SH * 0.28,
    left: SW * 0.02,
    zIndex: 1,
  },
  explanationBox: {
    position: 'absolute',
    bottom: SH * 0.06,
    width: SW * 0.38,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  explanationText: {
    position: 'absolute', // ✅ MUST

    width: SW * 0.34,
    height: SH * 0.24,

    bottom: SH * 0.12,
    left: SW * 0.04,

    textAlign: 'left',
    textAlignVertical: 'top', // 🔥 FIX ALIGNMENT

    color: '#fff',
    fontSize: rf(16), // Responsive 18
    lineHeight: rf(22),

    paddingHorizontal: 20,
    paddingTop: -6, // ✅ ADD THIS

    zIndex: 5,
  },
  nextBtnContainer: {
    position: 'absolute',
    bottom: SH * 0.06,
    right: SW * 0.05,
  },
  nextBtn: { width: SW * 0.28, height: 48 },
  // Incorrect answer styles
  incorrectResultBg2: {
    position: 'absolute',
    width: '10%',
    height: 20,
    top: 70,
    left: -16,
  },
  yourAnswerBox: {
    position: 'absolute',
    top: SH * 0.32,
    left: SW * 0.06,
    width: SW * 0.42,
    height: SH * 0.4,
  },
  yourAnswerLabel: { width: '76%', height: 52 },
  incorrectcorrect: { width: '32%', height: 52, bottom: 100, left: 50 },
  userAnswerImg: { width: '76%', height: 52 },
  correctAnswerBox: {
    position: 'absolute',
    top: SH * 0.32, // 👈 same as selectedOptionBox
    left: SW * 0.04,
    width: SW * 0.35,
    height: SH * 0.12,
  },
  correctAnswerLabel: {
    width: '80%',
    height: 56,
    position: 'absolute',
    top: -40,
  },
  correctAnswerImg: {
    width: '100%',
    height: '100%',
  },
  //  incorrectReasonPanel:{ position: 'absolute', bottom: SH * 0.32, width: SW * 0.35, height: SH * 0.12, left: SW * 0.32},
  // incorrectDetail: { position: 'absolute', top: SH * 0.65, alignSelf: 'center', width: SW * 0.85, height: 50 },

  // Cancel overlay
  dimBg: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  cancelBox: {
    position: 'absolute',
    top: 0,
    left: -10,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  cancelBg: {
    width: SW * 0.4,
    height: SH * 0.28,
    position: 'absolute',
    left: 16,
    top: 120,
  },
  cancelHint: {
    position: 'absolute',
    top: SH * 0.61,
    width: SW * 0.24,
    height: SH * 0.14,
    left: 30,
  },
  cancelSignal: {
    position: 'absolute',
    top: SH * 0.12,
    left: SW * 0.31,
    width: 66,
    height: 80,
  },
  cancelTime: {
    position: 'absolute',
    top: SH * 0.55,
    width: 130,
    height: 100,
    left: 36,
  },
  cancelContinueBtn: {
    position: 'absolute',
    bottom: SH * 0.05,
    left: SW * 0.2,
    zIndex: 10,
    width: SW * 0.24,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelExitBtn: {
    position: 'absolute',
    bottom: SH * 0.05,
    left: SW * 0.04,
    zIndex: 10,
    width: SW * 0.2,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancel: { position: 'absolute', left: 32, width: 240, height: 60, top: 54 },
  cancelActionImg: { width: '100%', height: '100%', resizeMode: 'contain' },
  cancelTimerText: {
    position: 'absolute',
    top: SH * 0.35,
    left: SW * 0.22,
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },

  // Score screen
  finalScore: { width: SW * 0.35, height: 100, top: 60, left: 50 },
  scoreBadge: {
    position: 'relative',
    alignSelf: 'flex-start',
    width: SW * 0.35,
    height: SH * 0.24,
    left: 50,
    top: 60,
  },
  scoreCountBox: {
    position: 'absolute',
    top: 94,
    alignSelf: 'flex-start',
    left: 120,
  },
  scoreCountText: {
    color: '#ffffff',
    fontSize: rf(38),
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
    right: 21,
  },
  finalScoreText: {
    position: 'absolute',
    bottom: SH * 0.08,
    alignSelf: 'center',
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },

  // Home screen
  homeOverlay: {
    height: '94%',
    justifyContent: 'center',
    alignItems: 'center',
    width: '54%',
    top: '16%',
    left: '1%',
  },
  welcomeOverlay: {
    height: '92%',
    justifyContent: 'center',
    alignItems: 'center',
    width: '46%',
    top: '13%',
    left: '-4%',
  },
  homeTitle: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 16,
  },
  startBtn: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 32,
  },
  startBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  exitAppBtn: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ff4444',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 32,
  },
  exitAppBtnText: { color: '#ff4444', fontSize: 20, fontWeight: 'bold' },

  centerOptionText: {
    position: 'absolute',

    width: '96%',
    height: '96%', // 🔥 MATCH IMAGE

    textAlign: 'left',
    textAlignVertical: 'center',
    left: 30,
    color: '#fff',
    fontSize: rf(15),
    fontWeight: '500',

    paddingHorizontal: 20,
  },
  retakeBtn: {
    width: SW * 0.26,
    height: 70,
    position: 'absolute',
    bottom: SH * 0.05,
    right: SW * 0.74,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  finishBtn: {
    width: SW * 0.2,
    height: 66,
    position: 'absolute',
    top: '80%',
    bottom: SH * 0.05,
    right: SW * 0.55,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  retakeImg: {
    width: SW * 0.28,
    height: 70,
  },

  finishImg: {
    width: SW * 0.22,
    height: 60,
  },
});
