import React, { useState, useEffect } from 'react';
import { Pin, Lightbulb, Check, Layout, LayoutGrid } from 'lucide-react';

const QuestionList = ({ questions = [], questionsPerPage = 10, userEmail, fileName, user_id, isDemo = false, onUpgradeClick }) => {
  const [answers, setAnswers] = useState({});
  const [bookmarks, setBookmarks] = useState({});
  const [showExplanation, setShowExplanation] = useState({});
  const [crossedChoices, setCrossedChoices] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  // Filter by fileName if provided
  const filteredQuestions = fileName ? questions.filter(q => q.file_name === fileName) : questions;
  // Calculate page info for multiple view mode
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  const startIndex = (currentPage - 1) * questionsPerPage;
  const endIndex = Math.min(startIndex + questionsPerPage, filteredQuestions.length);
  const visibleQuestions = filteredQuestions.slice(startIndex, endIndex);

  // For demo users, only show first 5 questions clearly, blur the rest
  const demoLimit = 5;
  const isDemoActive = isDemo && filteredQuestions.length > demoLimit;

  // Merge prop answers (from backend) into local state on mount
  useEffect(() => {
    const initialAnswers = {};
    questions.forEach(q => {
      if (q.answered) initialAnswers[q.id] = q.answered;
    });
    setAnswers(initialAnswers);
    // Also set bookmarks if flagged is present
    const initialBookmarks = {};
    questions.forEach(q => {
      if (q.flagged) initialBookmarks[q.id] = true;
    });
    setBookmarks(initialBookmarks);
  }, [questions]);

  // Reset currentPage to 1 whenever questions prop changes
  useEffect(() => {
    setCurrentPage(1);
  }, [questions]);

  // Handle selecting or deselecting an answer
  const handleAnswerClick = async (questionId, choiceId) => {
    if (!user_id) return alert('You must be logged in to answer.');
    const prevAnswer = answers[questionId];
    let newAnswer = choiceId;
    // If clicking the same answer, deselect
    if (prevAnswer === choiceId || choiceId === null) {
      newAnswer = ""; // Always use empty string to clear
    }
    setAnswers((prev) => ({ ...prev, [questionId]: newAnswer }));
    const payload = { user_id, user_email: userEmail, question_id: questionId, user_answer: newAnswer };
    console.log('Sending answer payload:', payload);
    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log('Response from /api/responses (answer):', data);
      window.dispatchEvent(new Event('user-activity'));
    } catch (e) {
      alert('Failed to save answer.');
      console.error(e);
    }
  };

  // Toggle bookmark status
  const toggleBookmark = async (questionId) => {
    if (!user_id) return alert('You must be logged in to bookmark.');
    setBookmarks((prev) => {
      const newBookmarks = { ...prev };
      if (newBookmarks[questionId]) {
        delete newBookmarks[questionId];
      } else {
        newBookmarks[questionId] = true;
      }
      return newBookmarks;
    });
    // Get the current answer for this question
    const currentAnswer = answers[questionId] || null;
    const payload = {
      user_id,
      user_email: userEmail,
      question_id: questionId,
      is_bookmarked: !bookmarks[questionId],
      user_answer: currentAnswer
    };
    console.log('Sending bookmark payload:', payload);
    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log('Response from /api/responses (bookmark):', data);
      window.dispatchEvent(new Event('user-activity'));
    } catch (e) {
      alert('Failed to update bookmark.');
      console.error(e);
    }
  };

  // Toggle strike through on text click
  const toggleStrikethrough = (questionId, choiceId, event) => {
    event.stopPropagation();
    const crossedKey = `${questionId}-${choiceId}`;
    const newCrossedChoices = { ...crossedChoices };
    if (newCrossedChoices[crossedKey]) {
      delete newCrossedChoices[crossedKey];
    } else {
      newCrossedChoices[crossedKey] = true;
    }
    setCrossedChoices(newCrossedChoices);
  };

  // Show/hide all explanations
  const handleShowAll = () => {
    if (showAll) {
      setShowExplanation({});
      setShowAll(false);
    } else {
      const all = {};
      visibleQuestions.forEach(q => { all[q.id] = true; });
      setShowExplanation(all);
      setShowAll(true);
    }
  };

  // Show explanation for a question after answering
  useEffect(() => {
    // For each answered question, show its explanation
    const newShowExplanation = { ...showExplanation };
    Object.keys(answers).forEach(qid => {
      if (answers[qid] !== null && answers[qid] !== undefined && answers[qid] !== "") {
        newShowExplanation[qid] = true;
      }
    });
    setShowExplanation(newShowExplanation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  // Responsive question card
  const renderQuestion = (question, index, isBlurred) => {
    // Robust fallback for all possible option/choice field names
    const getOption = (choiceId) => {
      const idx = ['a','b','c','d'].indexOf(choiceId);
      const upper = choiceId.toUpperCase();
      const lower = choiceId.toLowerCase();
      return (
        question[`option_${lower}`] ||
        question[`option_${upper}`] ||
        question[`option${upper}`] ||
        question[`option${idx+1}`] ||
        question[`answer_${idx+1}`] ||
        question[`answer${upper}`] ||
        question[`choice_${lower}`] ||
        question[`choice${upper}`] ||
        question[`choice${idx+1}`] ||
        ''
      );
    };
    const userAnswer = answers[question.id];
    const selectedAnswer = userAnswer || question.answered || null;
    const correctChoiceId = (question.correct_answer || question.correct_choice || '').toString().toUpperCase();
    // Only show correctness for the current selected answer
    const shouldShowCorrect = selectedAnswer !== null || showAll;
    // Add an Unsolve button if an answer is selected
    const showUnsolve = selectedAnswer !== null;
    // Get question number (prefer question.question_number, else index+1)
    const qNumber = question.question_number || index + 1;
    const questionText = question.question_text || question.text || '';
    const explanationText = question.rationale || question.explanation || '';
    return (
      <div key={question.id} className="mb-4 rounded-lg overflow-hidden shadow border border-gray-200 bg-white w-full relative">
        {isBlurred && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <div className="text-gray-500 font-semibold text-lg mb-2">Upgrade to unlock</div>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded font-bold shadow hover:bg-blue-700"
              onClick={onUpgradeClick}
            >
              Upgrade
            </button>
          </div>
        )}
        <div className="relative p-3 sm:p-4 bg-white">
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-3">
              <span className="inline-block rounded-lg bg-blue-600 text-white font-semibold text-base px-3 py-1 mr-2 align-middle">
                {`Q${qNumber}`}
              </span>
              <h3 className="text-sm sm:text-lg font-medium text-gray-900 pr-8 break-words">
                {questionText}
              </h3>
            </div>
            <button 
              onClick={() => toggleBookmark(question.id)}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Pin className={`w-4 h-4 ${bookmarks[question.id] ? 'text-blue-500 fill-blue-500' : 'text-gray-400'}`} />
            </button>
          </div>
        </div>
        <div className="p-2 sm:p-3 space-y-1 sm:space-y-2">
          {['a', 'b', 'c', 'd'].map(choiceId => {
            const optionText = getOption(choiceId);
            if (!optionText) return null;
            const crossedKey = `${question.id}-${choiceId}`;
            const isCrossed = crossedChoices[crossedKey];
            let choiceStyles = "w-full p-2 sm:p-3 text-left border-2 rounded-lg transition-all flex justify-between items-center text-xs sm:text-base ";
            // Highlight correct choice if showAll is active
            if (showAll && choiceId.toUpperCase() === correctChoiceId) {
              choiceStyles += "bg-green-50 border-green-500 ";
            } else if (shouldShowCorrect && selectedAnswer === choiceId && choiceId.toUpperCase() === correctChoiceId) {
              choiceStyles += "bg-green-50 border-green-500 ";
            } else if (shouldShowCorrect && selectedAnswer === choiceId && choiceId.toUpperCase() !== correctChoiceId) {
              choiceStyles += "bg-red-50 border-red-500 ";
            } else {
              choiceStyles += "bg-white border-gray-200 ";
            }
            if (selectedAnswer === choiceId) {
              choiceStyles += ' ring-2 ring-blue-400 ';
            }
            return (
              <button
                key={choiceId}
                onClick={() => handleAnswerClick(question.id, choiceId)}
                className={choiceStyles}
                aria-pressed={selectedAnswer === choiceId}
              >
                <div className="flex items-center gap-2 sm:gap-3 w-full">
                  <span className="font-medium text-xs sm:text-base text-stone-800 min-w-6 text-center">{choiceId.toUpperCase()}</span>
                  <span 
                    className={`text-xs sm:text-base text-stone-800 ${isCrossed ? 'line-through text-gray-400' : ''} cursor-pointer text-left`}
                    onClick={(e) => toggleStrikethrough(question.id, choiceId, e)}
                  >
                    {optionText}
                  </span>
                </div>
                {/* Show checkmark if correct and showAll is active, or if selected and correct */}
                {(showAll && choiceId.toUpperCase() === correctChoiceId) || (shouldShowCorrect && selectedAnswer === choiceId && choiceId.toUpperCase() === correctChoiceId) ? (
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0 ml-2" />
                ) : null}
              </button>
            );
          })}
          {/* Unsolve button */}
          {showUnsolve && (
            <button
              className="mt-2 px-3 py-1 rounded bg-gray-200 text-gray-700 text-xs hover:bg-gray-300 border border-gray-300"
              onClick={() => handleAnswerClick(question.id, null)}
            >
              Clear my answer
            </button>
          )}
        </div>
        {/* Explanation (rationale preferred) */}
        {showExplanation[question.id] && explanationText && (
          <div className="p-2 sm:p-3 mt-1 bg-yellow-50 border-t border-yellow-300 rounded-b-lg">
            <h4 className="font-medium text-yellow-900 mb-1 flex items-center text-xs sm:text-sm">
              <Lightbulb className="h-4 w-4 mr-2 text-yellow-500" />
              Explanation
            </h4>
            <p className="text-yellow-900 leading-relaxed text-xs sm:text-sm break-words">{explanationText}</p>
          </div>
        )}
      </div>
    );
  };

  // Main content: always paginated (multiple) view
  const renderContent = () => {
    if (filteredQuestions.length === 0) return <div>No questions available</div>;
    return (
      <div className="space-y-4 sm:space-y-6">
        {visibleQuestions.map((question, index) => {
          const isBlurred = isDemoActive && index >= demoLimit;
          return renderQuestion(question, index, isBlurred);
        })}
        {/* Show upgrade button after 5th question if demo */}
        {isDemoActive && visibleQuestions.length > demoLimit && (
          <div className="flex justify-center my-6">
            <button
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-lg shadow hover:bg-blue-700"
              onClick={onUpgradeClick}
            >
              Upgrade to Unlock All Questions
            </button>
          </div>
        )}
      </div>
    );
  };

  // Fixed footer navigation: remove viewMode switch button
  const renderFixedFooter = () => {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 sm:p-4 shadow-lg z-40">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-base ${currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            Previous
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 rounded-lg px-2 sm:px-3 py-1 flex items-center justify-center text-xs sm:text-base">
              <span className="text-gray-800 font-medium mx-1">
                {`${currentPage}/${totalPages}`}
              </span>
            </div>
            <button
              onClick={handleShowAll}
              className="ml-2 px-2 py-1 rounded bg-amber-200 text-amber-900 text-xs sm:text-sm font-semibold hover:bg-amber-300 border border-amber-300"
            >
              {showAll ? 'Hide Answers' : 'Show Answers'}
            </button>
          </div>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={`px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-base ${currentPage === totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full px-0 sm:px-0 pb-24 pt-2">
      {renderContent()}
      {renderFixedFooter()}
    </div>
  );
};

export default QuestionList;