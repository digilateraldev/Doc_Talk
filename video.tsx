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
import { VIDEO_SOURCES } from './src/constants/videoSources';

// V, UI, QUESTIONS now imported from constants - cleaner main file!


const { width, height } = Dimensions.get('window');

export const wp = (percent: number) => (width * percent) / 100;
export const hp = (percent: number) => (height * percent) / 100;

export const rf = (size: number) => {
  const baseWidth = 812;
  return Math.round((size * width) / baseWidth);
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

  const [preloadedVideos, setPreloadedVideos] = useState(new Set());
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
const videoSource = React.useMemo(() => {
  return getVideoSource(
    phase,
    qIndex,
    lastCorrect,
    score,
  );
}, [phase, qIndex, lastCorrect, score]);

  // Preload all videos
  useEffect(() => {
    const allSources = [
      VIDEO_SOURCES.opening,
      VIDEO_SOURCES.cancel,
      ...VIDEO_SOURCES.question,
      ...VIDEO_SOURCES.correct,
      ...VIDEO_SOURCES.incorrect,
      ...VIDEO_SOURCES.score,
      VIDEO_SOURCES.exit[0],
    ];
    allSources.forEach(source => {
      if (!preloadedVideos.has(source)) {
        setPreloadedVideos(prev => new Set([...prev, source]));
      }
    });
  }, []);

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

    setPhase('exitVideo');
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
      {/* ── Video Player — smooth source switching ── */}
      
 <RNVideo
  source={videoSource}
  style={s.video}
  resizeMode="cover"
  onEnd={onVideoEnd}
  muted={isMuted}
  controls={false}
  repeat={false}
  preventsDisplaySleepDuringVideoPlayback={false}
  automaticallyWaitsToMinimizeStalling={false}
  paused={
    phase === 'home' ||
    phase === 'cancel' ||
    (phase === 'resultVideo' && paused)
  }
  bufferConfig={{
    minBufferMs: 1000,
    maxBufferMs: 3000,
    bufferForPlaybackMs: 250,
    bufferForPlaybackAfterRebufferMs: 500,
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
                <TouchableOpacity style={s.topRightBtnWrap} onPress={() => setIsMuted(prev => !prev)}>
                <Image
                  source={UI_ASSETS.audioBtn}
                  style={[s.topRightBtn, { opacity: isMuted ? 0.4 : 1 }]}
                />
                </TouchableOpacity>

              <TouchableOpacity
                onPress={onCancelPress}
                disabled={phase === 'cancel' || phase === 'score'}
                style={s.topRightBtnWrap}
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
  <View style={s.timerWrap}>
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
              <Text style={[s.centerOptionText]}>
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
                style={[s.resultBanner]}
                resizeMode="contain"
              />
            </View>

            <View style={s.correctAnswerBox}>
              <Image
                source={getOptionImage(QUESTIONS[qIndex].correctAnswer)}
                style={s.correctAnswerImg}
                resizeMode="stretch"
              />

              <Text style={[s.centerOptionText]}>
                {QUESTIONS[qIndex].options[QUESTIONS[qIndex].correctAnswer]}
              </Text>
            </View>

            {/* Reason */}
            <Image
              source={UI_ASSETS.reasonPanel} 
              style={[s.reasonPanel]}
              resizeMode="contain"
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
                style={[s.cancelActionImg, { left: wp(4), width: wp(20), bottom: hp(2) }]}
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
                left: wp(6),
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
  video: { ...StyleSheet.absoluteFill, },
  overlay: { ...StyleSheet.absoluteFill },

  // Options screen — left panel
  leftPanel: {
    position: 'absolute',
    left: wp(4),
    top: hp(12),
    bottom: 0,
    width: wp(100) * 0.38 + wp(4), // panel width + some question padding
    paddingHorizontal: 4,
  },
  questionPanel: {
  width: wp(36),
  height: hp(15),
  justifyContent: 'center',
},
  optionRow: {
  width: wp(36),
  height: hp(15),
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'hidden',
  marginTop: hp(1),
},

optionImg: {
  ...StyleSheet.absoluteFill,
  width: undefined,
  height: undefined,
},

optionTextStyle: {
  position: 'absolute',

  width: '76%',
  height: '100%',

  alignSelf: 'center',

  color: '#fff',
  fontSize: rf(14),

  fontWeight: '500',

  textAlign: 'left',
  textAlignVertical: 'center',

  includeFontPadding: false,

  lineHeight: rf(18),
  paddingVertical: hp(2.5),
  left: wp(6),
},
  optionBorder: {
  position: 'absolute',
  width: '100%',
  height: '90%',
  borderWidth: 3,
  borderColor: '#fff',
  borderRadius: 14,
},
  optionTap: { ...StyleSheet.absoluteFill },

  // Question and option text
  questionText: {
  position: 'absolute',

  width: '74%',
  height: '100%',

  alignSelf: 'center',

  color: '#fff',
  fontSize: rf(14),
  fontWeight: 'bold',

  textAlign: 'left',
  textAlignVertical: 'center',

  includeFontPadding: false,

  lineHeight: rf(18),
  paddingTop: hp(2),
  left: wp(6.4),
},
  optionTextSelected: { color: '#FFD700' },

  // Permanent header (opening onwards)
  permHeader: {
    position: 'absolute',
    top: hp(2),
    left: 0,
    right: 0,
    height: hp(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    zIndex: 99,
  },
  logoImg: { width: wp(30), height: hp(20),right: wp(4) },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: wp(2), left: wp(24) },
  scoreImg: { width: wp(20), height: hp(12), right: wp(4) },
  scoreText: {
    color: '#fff',
    fontSize: rf(18),
    fontWeight: 'bold',
    right: wp(15),
    top: hp(2),
  },
  headerRight: {
    flexDirection: 'row',
    gap: wp(2),
    alignItems: 'center',
    marginRight: wp(2),
  },
  topRightBtnWrap: {
  width: wp(4.7),
  height: hp(14),
  justifyContent: 'center',
  alignItems: 'center',
},

topRightBtn: {
  width: '100%',
  height: '100%',
  resizeMode: 'contain',
},
  helpBtn: {
    width: wp(12),
    height: hp(6),
    borderRadius: hp(3),
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
  bottom: hp(0),
  left: wp(0.4),
},

timerWrap: {
  width: wp(20),
  height: hp(10),
  justifyContent: 'center',
  alignItems: 'center',
},

timeImg: {
  ...StyleSheet.absoluteFill,
  width: undefined,
  height: undefined,
},

timerText: {
  position: 'absolute',

  width: '100%',
  height: '100%',

  color: '#fff',
  fontSize: rf(18),
  fontWeight: 'bold',

  textAlign: 'center',
  textAlignVertical: 'center',

  includeFontPadding: false,
  paddingVertical: hp(4),
},
  bottomRight: {
  position: 'absolute',
  bottom: hp(2),
  right: wp(4),

  width: wp(22),
  height: hp(14),

  justifyContent: 'center',
  alignItems: 'center',
},

submitImg: {
  width: '100%',
  height: '100%',
  resizeMode: 'contain',
},
resultOverlay: {
  ...StyleSheet.absoluteFill,
},

pauseIcon: {
  position: 'absolute',
  top: '45%',
  alignSelf: 'center',
  fontSize: rf(40),
  color: 'rgba(255,255,255,0.8)',
},

/* ───────── RESULT BANNER ───────── */

correctResultBg: {
  position: 'absolute',
  top: hp(14),
  alignSelf: 'flex-start',

  width: wp(48),
  height: hp(14),

  justifyContent: 'flex-start',
  alignItems: 'center',
  right: wp(60),
},

incorrectResultBg2: {
  position: 'absolute',
  top: hp(12),
  alignSelf: 'flex-start',

  width: wp(48),
  height: hp(14),

  justifyContent: 'flex-start',
  alignItems: 'center',

  right: wp(55),
},

resultBanner: {
  width: '100%',
  height: '100%',
},

/* ───────── SELECTED / CORRECT OPTION ───────── */

selectedOptionBox: {
  position: 'absolute',
  top: hp(34),
  left: wp(4.4),

  width: wp(36),
  height: hp(14),

  justifyContent: 'center',
  alignItems: 'center',
},

correctAnswerBox: {
  position: 'absolute',
  top: hp(34),
  left: wp(4.4),

  width: wp(36),
  height: hp(14),
},

selectedOptionImg: {
  ...StyleSheet.absoluteFill,
  width: undefined,
  height: undefined,
},

correctAnswerImg: {
  position: 'absolute',
  width: '92%',
  height: '100%',
},

/* ───────── OPTION TEXT ───────── */

centerOptionText: {
  position: 'absolute',

  width: '68%',
  height: '72%',

  alignSelf: 'center',

  top: '14%',

  color: '#fff',
  fontSize: rf(13),
  fontWeight: '500',

  textAlign: 'left',
  textAlignVertical: 'center',

  includeFontPadding: false,

  lineHeight: rf(17),
},

/* ───────── REASON PANEL ───────── */

reasonPanel: {
  position: 'absolute',

  top: hp(54),
  left: wp(2),

  width: wp(40),
  height: hp(28),
},

/* ───────── EXPLANATION TEXT ───────── */

explanationText: {
  position: 'absolute',

  top: hp(58),
  left: wp(5),

  width: wp(34),
  height: hp(18),

  color: '#fff',
  fontSize: rf(14),

  lineHeight: rf(16),

  textAlign: 'left',
},

/* ───────── NEXT BUTTON ───────── */

nextBtnContainer: {
  position: 'absolute',

  bottom: hp(5),
  right: wp(4),

  width: wp(28),
  height: hp(12),

  justifyContent: 'center',
  alignItems: 'center',
},

nextBtn: {
  width: '100%',
  height: '100%',
  resizeMode: 'contain',
},
  
  dimBg: {
  ...StyleSheet.absoluteFill,
  backgroundColor: 'rgba(0,0,0,0.45)',
},

/* ───────── MAIN CONTAINER ───────── */

cancelBox: {
  position: 'absolute',

  top: hp(18),
  left: wp(4),

  width: wp(42),
  height: hp(62),
},

/* ───────── TITLE ───────── */

cancel: {
  position: 'absolute',

  bottom: hp(50),
  left: (14),

  width: wp(26),
  height: hp(16),
},

/* ───────── MAIN PANEL ───────── */

cancelBg: {
  position: 'absolute',

  top: hp(14),
  left: 0,

  width: wp(40),
  height: hp(28),
},

/* ───────── SIGNAL ICON ───────── */

cancelSignal: {
  position: 'absolute',

  bottom: hp(48),
  right: wp(4),

  width: wp(8),
  height: hp(16),
},

/* ───────── HINT PANEL ───────── */

cancelHint: {
  position: 'absolute',

  top: hp(42),
  left: wp(2),

  width: wp(28),
  height: hp(20),
},

/* ───────── TIMER PANEL (IF USED) ───────── */

// cancelTime: {
//   position: 'absolute',

//   top: hp(40),
//   right: wp(2),

//   width: wp(20),
//   height: hp(10),
// },

// cancelTimerText: {
//   position: 'absolute',

//   top: hp(42),
//   right: wp(8),

//   color: '#fff',
//   fontSize: rf(30),
//   fontWeight: 'bold',
// },

/* ───────── BUTTON ROW ───────── */

cancelContinueBtn: {
  position: 'absolute',

  top: hp(67),
  right: wp(24),

  width: wp(20),
  height: hp(10),

  justifyContent: 'center',
  alignItems: 'center',
  
},

cancelExitBtn: {
  position: 'absolute',

  top: hp(64),
  left: wp(22),

  width: wp(22),
  height: hp(12),

  justifyContent: 'center',
  alignItems: 'center',
},

cancelActionImg: {
  width: '100%',
  height: '100%',
  resizeMode: 'contain',
},

  /* ───────── FINAL SCORE TITLE ───────── */

finalScore: {
  position: 'absolute',

  top: hp(14),
  right: wp(64),

  width: wp(38),
  height: hp(20),
},

/* ───────── SCORE NUMBER ───────── */

scoreCountBox: {
  position: 'absolute',

  top: hp(20),
  left: wp(2),

  width: wp(12),
  height: hp(12),

  justifyContent: 'center',
  alignItems: 'center',
},

scoreCountText: {
  color: '#fff',

  fontSize: rf(32),
  fontWeight: 'bold',

  textAlign: 'center',

  includeFontPadding: false,

  textShadowColor: '#000',
  textShadowOffset: {
    width: 1,
    height: 1,
  },
  textShadowRadius: 5,
},

/* ───────── BADGE ───────── */

scoreBadge: {
  position: 'absolute',

  top: hp(36),
  left: wp(4),

  width: wp(34),
  height: hp(22),
},

/* ───────── OPTIONAL TEXT ───────── */

finalScoreText: {
  position: 'absolute',

  bottom: hp(10),
  alignSelf: 'center',

  color: '#fff',

  fontSize: rf(28),
  fontWeight: 'bold',
},

  // Home screen
  homeOverlay: {
    height: '94%',
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '54%',
    top: '16%',
    right: '10%',
  },
  welcomeOverlay: {
    height: '92%',
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '46%',
    top: '13%',
    right: '1%',
  },
  
retakeBtn: {
  position: 'absolute',

  top: hp(60),
  left: wp(16),

  width: wp(22),
  height: hp(14),

  justifyContent: 'center',
  alignItems: 'center',

  zIndex: 10,
},

finishBtn: {
  position: 'absolute',

  top: hp(64),
  left: wp(0),

  width: wp(22),
  height: hp(12),

  justifyContent: 'center',
  alignItems: 'center',

  zIndex: 10,
},

retakeImg: {
  width: '100%',
  height: '100%',
  resizeMode: 'contain',
},

finishImg: {
  width: '100%',
  height: '100%',
  resizeMode: 'contain',
},
});
 