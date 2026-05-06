// src/constants/videoSources.ts

// src/constants/videoSources.ts

export const VIDEO_SOURCES = {
  opening: require('../../assets/Video/OpeningScene.mp4'),
  cancel: require('../../assets/Video/CancelMessage.mp4'),

  question: [
    require('../../assets/Video/question/Scene1.mp4'),
    require('../../assets/Video/question/Scene2.mp4'),
    require('../../assets/Video/question/Scene3.mp4'),
    require('../../assets/Video/question/Scene4.mp4'),
    require('../../assets/Video/question/Scene5.mp4'),
  ],

  correct: [
    require('../../assets/Video/correct/Q1Correct.mp4'),
    require('../../assets/Video/correct/Q2Correct.mp4'),
    require('../../assets/Video/correct/Q3Correct.mp4'),
    require('../../assets/Video/correct/Q4Correct.mp4'),
    require('../../assets/Video/correct/Q5Correct.mp4'),
  ],

  incorrect: [
    require('../../assets/Video/incorrect/Q1Incorrect.mp4'),
    require('../../assets/Video/incorrect/Q2Incorrect.mp4'),
    require('../../assets/Video/incorrect/Q3Incorrect.mp4'),
    require('../../assets/Video/incorrect/Q4Incorrect.mp4'),
    require('../../assets/Video/incorrect/Q5Incorrect.mp4'),
  ],

  score: [
    require('../../assets/Video/afterScore/Score1.mp4'),
    require('../../assets/Video/afterScore/Score2.mp4'),
    require('../../assets/Video/afterScore/Score3.mp4'),
  ],
  exit:[
    require('../../assets/Video/CancelMessage.mp4'),
  ]
};

// 🔥 Video selector (NO CHANGE needed)
export const getVideoSource = (
  phase: string,
  qIndex: number,
  isCorrect: boolean,
  score: number
) => {

  if (phase === 'opening') return VIDEO_SOURCES.opening;
  if (phase === 'cancel') return VIDEO_SOURCES.cancel;

  if (phase === 'questionVideo' || phase === 'options') {
    return VIDEO_SOURCES.question[qIndex];
  }
if (phase === 'exitVideo') {
  return VIDEO_SOURCES.exit[0];
}
  if (phase === 'resultVideo') {
    return isCorrect
      ? VIDEO_SOURCES.correct[qIndex]
      : VIDEO_SOURCES.incorrect[qIndex];
  }

 if (phase === 'score') {
  if (score <= 3) {
    return VIDEO_SOURCES.score[0];   // 0–3
  }
  if (score <= 7) {
    return VIDEO_SOURCES.score[1];   // 4–7
  }
  return VIDEO_SOURCES.score[2];     // 8–10
}

  return VIDEO_SOURCES.opening;
};