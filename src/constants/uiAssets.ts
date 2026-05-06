// All PNG image assets for UI overlays - extracted for clarity
// Grouped by screen/phase. Used by various quiz components.
// ImageBackground and Image components reference these.

export const UI_ASSETS = {
  // ── Options Screen (question + 4 options + timer/submit) ──
  optionA: require('../../assets/Quiz Overlay Assets/Option A Panel.png'),
  optionB: require('../../assets/Quiz Overlay Assets/Option B Panel.png'),
  optionC: require('../../assets/Quiz Overlay Assets/Option C Panel.png'),
  optionD: require('../../assets/Quiz Overlay Assets/Option D Panel.png'),
  optionQ1: require('../../assets/Quiz Overlay Assets/Option Q1 Panel.png'), // Question box
  audioBtn: require('../../assets/Quiz Overlay Assets/Audio Button.png'),
  exitBtn: require('../../assets/Quiz Overlay Assets/Exit Button.png'),
  scoreBtn: require('../../assets/Quiz Overlay Assets/Score Button.png'),
  submitBtn: require('../../assets/Quiz Overlay Assets/Submit Button.png'),
  timeBtn: require('../../assets/Quiz Overlay Assets/Time Button.png'),

  // ── Correct Answer Screen ──
  correctAnswer: require('../../assets/KBC Correct Quiz/Correct Answer.png'),
  nextBtn: require('../../assets/KBC Correct Quiz/Next.png'),
  reasonPanel: require('../../assets/KBC Correct Quiz/Reason panel.png'),

  // ── Incorrect Answer Screen ──
  incorrectAnswer: require('../../assets/KBC Incorrect Quiz/Incorrect Answer.png'),
  incorrectOptA: require('../../assets/KBC Incorrect Quiz/A  Option Panel.png'),
  incorrectOptB: require('../../assets/KBC Incorrect Quiz/B option panel.png'),
  incorrectCorrect: require('../../assets/KBC Incorrect Quiz/Correct Answer.png'),
  yourAnswer: require('../../assets/KBC Incorrect Quiz/Your answer.png'),

  // ── Cancel/Quit Screen ──
  cancelQuiz: require('../../assets/KBC Cancel Quiz/Cancel Quiz.png'),
  continueQuiz: require('../../assets/KBC Cancel Quiz/Continue Quiz Button.png'),
  exitQuizBtn: require('../../assets/KBC Cancel Quiz/Exit Quiz Button.png'),
  hintPanel: require('../../assets/KBC Cancel Quiz/Hint Panel.png'),
  quitPanel: require('../../assets/KBC Cancel Quiz/Quit Panel.png'),
  signalBtn: require('../../assets/KBC Cancel Quiz/Signal Button.png'),
  timePanel: require('../../assets/KBC Cancel Quiz/Time Panel.png'),
  

  // ── Final Score Screen ──
  quizScore: require('../../assets/KBC Quiz score ui/Quiz Score.png'),
  goodAttempt: require('../../assets/KBC Quiz score ui/Good attempt.png'),
  consultDoctor: require('../../assets/KBC Quiz score ui/Consult your doctor.png'),

  // ── Other ──
  logo: require('../../assets/Doc_Talk.png'), // Header logo
  retake: require('../../assets/Retake.png'),
  finish: require('../../assets/Finish.png'),
  welcome: require('../../assets/welcome.png'), // Home background
} as const; // Readonly for type safety

// Helper: Get option image by index (A=0, B=1, C=2, D=3)
export const getOptionImage = (index: number) => {
  const options = [UI_ASSETS.optionA, UI_ASSETS.optionB, UI_ASSETS.optionC, UI_ASSETS.optionD];
  return options[index] || UI_ASSETS.optionA;
};

