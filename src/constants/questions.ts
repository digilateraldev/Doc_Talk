// All 5 GERD quiz questions - extracted for clarity
// Each question has: correctAnswer index (0=A,1=B,2=C,3=D), video refs (to be replaced by VIDEO_SOURCES),
// question text, options, explanations for correct/incorrect screens.

export interface QuestionData {
  correctAnswer: number; // 0=A, 1=B, 2=C, 3=D
  questionVideo: any; // Will be replaced by VIDEO_SOURCES.question[index]
  correctVideo: any; // VIDEO_SOURCES.correct[index]
  incorrectVideo: any; // VIDEO_SOURCES.incorrect[index]
  questionText: string;
  options: string[];
  correctExplanation: string;
  incorrectExplanation: string;
}

export const QUESTIONS: QuestionData[] = [
  {
    correctAnswer: 2, // C
    questionVideo: null, // Use VIDEO_SOURCES.question[0]
    correctVideo: null, // VIDEO_SOURCES.correct[0]
    incorrectVideo: null, // VIDEO_SOURCES.incorrect[0]
    questionText: 'In GERD, what usually happens?',
    options: [
      'Food gets stuck in the large intestine',
      'The liver produces too much bile',
      'Acid or food comes back up from the \nstomach into the food pipe',
      'The pancreas stops digesting food'
    ],
    correctExplanation: 'In GERD, stomach acid or food can flow back into the food pipe.This backflow causes irritation and discomfort in the chest.',
    incorrectExplanation: 'Not quite. In GERD, stomach acid or food flows back into the food pipe.This backflow causes irritation and discomfort in the chest.'
  },
  {
    correctAnswer: 3, // D
    questionVideo: null,
    correctVideo: null,
    incorrectVideo: null,
    questionText: 'Which symptoms are commonly\nlinked with GERD?',
    options: [
      'Pain only in the lower right side of  the stomach',
      'Loose motions with blood and fever',
      'Yellow eyes and dark urine',
      'Burning in the chest and sour liquid\ncoming up into the throat'
    ],
    correctExplanation: 'GERD often causes a burning feeling in the chest called heartburn.Sour or acidic liquid may also rise into the throat.',
    incorrectExplanation: 'Not quite. GERD often causes a burning feeling in the chest.Sour or acidic liquid may also  rise into the throat.'
  },
  {
    correctAnswer: 1, // B
    questionVideo: null,
    correctVideo: null,
    incorrectVideo: null,
    questionText: 'Which habit can make reflux worse?',
    options: [
      'Sitting upright after food',
      'Lying down soon after a heavy meal',
      'Eating slowly and in smaller portions',
      'Walking gently after dinner'
    ],
    correctExplanation: 'Lying down after eating makes it  easier for acid to move upward. Gravity no longer helps keep stomach contents down.',
    incorrectExplanation: 'Not quite. Lying down after eating  makes acid move upward more easily. Gravity cannot prevent the backflow  in this position.'
  },
  {
    correctAnswer: 3, // D
    questionVideo: null,
    correctVideo: null,
    incorrectVideo: null,
    questionText: 'Which warning sign should not be\nignored?',
    options: [
      'Occasional burping after a heavy meal',
      'Mild fullness after eating too much',
      'Feeling hungry before lunch',
      'Difficulty swallow or unexplained weight loss'
    ],
    correctExplanation: 'Difficulty swallowing can indicate a serious underlying problem. Unexplained weight loss should always be checked by a doctor.',
    incorrectExplanation: 'Not quite. Difficulty swallowing can be  a serious warning sign.Unexplained weight loss should not be ignored.'
  },
  {
    correctAnswer: 0, // A
    questionVideo: null,
    correctVideo: null,
    incorrectVideo: null,
    questionText: 'If acidity or reflux keeps coming back,what is the right thing to do?',
    options: [
      'Speak to a doctor for proper advice',
      'Keep taking random medicines on your own',
      'Ignore it if it happens often',
      'Stop eating most foods without guidance'
    ],
    correctExplanation: 'Frequent reflux needs proper medical evaluation and guidance. Self-medication can hide symptoms and delay correct treatment.',
    incorrectExplanation: 'Not quite. Frequent reflux should be checked by a doctor.Self-medicating repeatedly is not a safe solution.'
  },
];

