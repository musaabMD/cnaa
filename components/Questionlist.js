import React, { useState, useEffect } from 'react';
import { Pin, Lightbulb, Check, ArrowLeft, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const QuestionList = ({ questions = [], questionsPerPage = 10, userEmail, fileName, user_id, isDemo = false, onUpgradeClick, examName = "" }) => {
  const [answers, setAnswers] = useState({});
  const [bookmarks, setBookmarks] = useState({});
  const [showExplanation, setShowExplanation] = useState({});
  const [crossedChoices, setCrossedChoices] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Get unique subjects and categories from questions
  const subjects = Array.from(new Set(questions.map(q => q.subject).filter(Boolean)));
  const categories = Array.from(new Set(questions.map(q => q.category).filter(Boolean)));

  // Filter by fileName, subject, category, and search
  let filteredQuestions = fileName ? questions.filter(q => q.file_name === fileName) : questions;
  if (subjectFilter && subjectFilter !== '__all__') filteredQuestions = filteredQuestions.filter(q => q.subject === subjectFilter);
  if (categoryFilter && categoryFilter !== '__all__') filteredQuestions = filteredQuestions.filter(q => q.category === categoryFilter);
  if (search) filteredQuestions = filteredQuestions.filter(q => (q.question_text || "").toLowerCase().includes(search.toLowerCase()));

  // Calculate page info for multiple view mode
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  const startIndex = (currentPage - 1) * questionsPerPage;
  const endIndex = Math.min(startIndex + questionsPerPage, filteredQuestions.length);
  const visibleQuestions = filteredQuestions.slice(startIndex, endIndex);

  // For demo users, only show first 5 questions clearly, blur the rest
  const demoLimit = 5;
  const isDemoActive = isDemo && filteredQuestions.length > demoLimit;

  useEffect(() => {
    const initialAnswers = {};
    questions.forEach(q => {
      if (q.answered) initialAnswers[q.id] = q.answered;
    });
    setAnswers(initialAnswers);
    const initialBookmarks = {};
    questions.forEach(q => {
      if (q.flagged) initialBookmarks[q.id] = true;
    });
    setBookmarks(initialBookmarks);
  }, [questions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [questions, subjectFilter, categoryFilter, search]);

  const handleAnswerClick = async (questionId, choiceId) => {
    if (!user_id) {
      setShowLoginModal(true);
      return;
    }
    const prevAnswer = answers[questionId];
    let newAnswer = choiceId;
    if (prevAnswer === choiceId || choiceId === null) {
      newAnswer = "";
    }
    setAnswers((prev) => ({ ...prev, [questionId]: newAnswer }));
    const payload = { user_id, user_email: userEmail, question_id: questionId, user_answer: newAnswer };
    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await res.json();
      window.dispatchEvent(new Event('user-activity'));
    } catch (e) {
      alert('Failed to save answer.');
    }
  };

  const toggleBookmark = async (questionId) => {
    if (!user_id) {
      setShowLoginModal(true);
      return;
    }
    setBookmarks((prev) => {
      const newBookmarks = { ...prev };
      if (newBookmarks[questionId]) {
        delete newBookmarks[questionId];
      } else {
        newBookmarks[questionId] = true;
      }
      return newBookmarks;
    });
    const currentAnswer = answers[questionId] || null;
    const payload = {
      user_id,
      user_email: userEmail,
      question_id: questionId,
      is_bookmarked: !bookmarks[questionId],
      user_answer: currentAnswer
    };
    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await res.json();
      window.dispatchEvent(new Event('user-activity'));
    } catch (e) {
      alert('Failed to update bookmark.');
    }
  };

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

  useEffect(() => {
    const newShowExplanation = { ...showExplanation };
    Object.keys(answers).forEach(qid => {
      if (answers[qid] !== null && answers[qid] !== undefined && answers[qid] !== "") {
        newShowExplanation[qid] = true;
      }
    });
    setShowExplanation(newShowExplanation);
  }, [answers]);

  const renderQuestion = (question, index, isBlurred) => {
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
    const shouldShowCorrect = selectedAnswer !== null || showAll;
    const showUnsolve = selectedAnswer !== null;
    const qNumber = question.question_number || index + 1;
    const questionText = question.question_text || question.text || '';
    const explanationText = question.rationale || question.explanation || '';
    return (
      <div key={question.id} className="mb-4 rounded-2xl overflow-hidden shadow-lg bg-white w-full max-w-2xl mx-auto relative p-0 sm:p-0" style={{ width: '100%' }}>
        {isBlurred && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <div className="text-gray-500 font-semibold text-lg mb-2">Upgrade to unlock</div>
            <Button
              className="bg-blue-600 text-white px-4 py-2 rounded font-bold shadow hover:bg-blue-700"
              onClick={onUpgradeClick}
            >
              Upgrade
            </Button>
          </div>
        )}
        <div className="relative p-4 sm:p-8 bg-white">
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-3">
              <span className="inline-block rounded-lg bg-blue-600 text-white font-semibold text-lg sm:text-base px-4 py-2 mr-2 align-middle">
                {`Q${qNumber}`}
              </span>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 pr-8 break-words leading-snug">
                {questionText}
              </h3>
            </div>
            <Button 
              variant="ghost"
              size="icon"
              onClick={() => toggleBookmark(question.id)}
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Pin className={`w-5 h-5 ${bookmarks[question.id] ? 'text-blue-500 fill-blue-500' : 'text-gray-400'}`} />
            </Button>
          </div>
        </div>
        <div className="p-2 sm:p-3 space-y-1 sm:space-y-2">
          {['a', 'b', 'c', 'd'].map(choiceId => {
            const optionText = getOption(choiceId);
            if (!optionText) return null;
            const crossedKey = `${question.id}-${choiceId}`;
            const isCrossed = crossedChoices[crossedKey];
            let choiceStyles = "w-full p-2 sm:p-3 text-left border-2 rounded-lg transition-all flex justify-between items-center text-xs sm:text-base ";
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
              <Button
                key={choiceId}
                variant="outline"
                size="lg"
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
                {(showAll && choiceId.toUpperCase() === correctChoiceId) || (shouldShowCorrect && selectedAnswer === choiceId && choiceId.toUpperCase() === correctChoiceId) ? (
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0 ml-2" />
                ) : null}
              </Button>
            );
          })}
          {showUnsolve && (
            <Button
              className="mt-2 px-3 py-1 rounded bg-gray-200 text-gray-700 text-xs hover:bg-gray-300 border border-gray-300"
              onClick={() => handleAnswerClick(question.id, null)}
            >
              Clear my answer
            </Button>
          )}
        </div>
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

  // --- Filter UI ---
  const renderFilters = () => (
    <div className="flex flex-col sm:flex-row gap-2 mb-4 w-full max-w-2xl mx-auto">
      <Select value={subjectFilter || '__all__'} onValueChange={v => setSubjectFilter(v)}>
        <SelectTrigger className="w-full sm:w-[180px] bg-white border-2 border-blue-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-300">
          <SelectValue placeholder="All Subjects" />
        </SelectTrigger>
        <SelectContent className="rounded-lg border-2 border-blue-200 shadow-lg">
          <SelectItem value="__all__">All Subjects</SelectItem>
          {subjects.map(subj => (
            <SelectItem key={subj} value={subj}>{subj}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={categoryFilter || '__all__'} onValueChange={v => setCategoryFilter(v)}>
        <SelectTrigger className="w-full sm:w-[180px] bg-white border-2 border-blue-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-300">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent className="rounded-lg border-2 border-blue-200 shadow-lg">
          <SelectItem value="__all__">All Categories</SelectItem>
          {categories.map(cat => (
            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  // --- Filter Modal for Mobile/Tablet ---
  const renderFilterModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full relative">
        <button className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100" onClick={() => setShowFilterModal(false)}>
          <X className="h-6 w-6 text-gray-500" />
        </button>
        <h2 className="text-lg font-bold mb-4 text-center">Filter & Search</h2>
        <Input
          type="text"
          placeholder="Search questions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-4 pl-10 pr-4 py-2 text-base bg-white border-2 border-blue-200 rounded-lg shadow-sm w-full"
        />
        {renderFilters()}
        <Button className="w-full mt-4 bg-blue-600 text-white font-bold" onClick={() => setShowFilterModal(false)}>
          Apply
        </Button>
      </div>
    </div>
  );

  // --- Sticky Nav Bar ---
  const router = useRouter();
  const renderStickyNav = () => (
    <nav className="sticky top-0 z-40 w-full flex flex-col sm:flex-row sm:items-center px-4 py-2 gap-2 sm:gap-4 bg-white">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="mr-2" onClick={() => router.push('/')}> 
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <span className="text-xs font-semibold tracking-widest text-blue-700 uppercase">Scoorly</span>
        <span className="hidden sm:inline text-gray-300">|</span>
        <span className="text-base sm:text-lg font-bold text-blue-900">{examName}</span>
      </div>
      <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full max-w-2xl ml-auto">
        {/* Mobile/Tablet: Show Filter & Search Button */}
        <div className="flex sm:hidden w-full">
          <Button className="w-full bg-blue-600 text-white font-bold" onClick={() => setShowFilterModal(true)}>
            Filter & Search
          </Button>
        </div>
        {/* Desktop: Show Filters Inline */}
        <div className="hidden sm:flex flex-1 gap-2">
          <Input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 text-base bg-white border-2 border-blue-200 rounded-lg shadow-sm w-full sm:w-auto"
          />
          {renderFilters()}
        </div>
      </div>
    </nav>
  );

  const renderHeader = () => (
    <>
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full text-center">
            <h2 className="text-xl font-bold mb-4">You must be logged in to answer</h2>
            <p className="mb-6 text-gray-600">Please log in to answer questions or bookmark them.</p>
            <Button className="w-full bg-blue-600 text-white font-bold mb-2" onClick={() => router.push('/signin')}>
              Go to Login
            </Button>
            <Button className="w-full mt-2" variant="outline" onClick={() => setShowLoginModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {renderStickyNav()}
      <div className=" flex flex-col items-center">
        <div className="max-w-3xl w-full flex flex-col items-center px-2">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-blue-900 mb-2 text-center">{examName ? examName : 'Practice Questions'}</h2>
          {filteredQuestions.length} Question{filteredQuestions.length !== 1 ? 's' : ''} 

          <div className="w-full text-right mt-2 text-gray-500 text-lg font-medium">
          </div>
        </div>
      </div>
    </>
  );

  const renderContent = () => {
    if (filteredQuestions.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <h3 className="text-xl font-medium text-gray-700 mb-2">No questions found</h3>
          <p className="text-gray-500">Try changing your search or filters to find questions.</p>
        </div>
      );
    }
    return (
      <div className="space-y-4 sm:space-y-6">
        {visibleQuestions.map((question, index) => {
          const isBlurred = isDemoActive && index >= demoLimit;
          return renderQuestion(question, index, isBlurred);
        })}
        {isDemoActive && visibleQuestions.length > demoLimit && (
          <div className="flex justify-center my-6">
            <Button
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-lg shadow hover:bg-blue-700"
              onClick={onUpgradeClick}
            >
              Upgrade to Unlock All Questions
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderFixedFooter = () => {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 sm:p-4 shadow-lg z-40">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <Button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-base ${currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            Previous
          </Button>
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 rounded-lg px-2 sm:px-3 py-1 flex items-center justify-center text-xs sm:text-base">
              <span className="text-gray-800 font-medium mx-1">
                {`${currentPage}/${totalPages}`}
              </span>
            </div>
            <Button
              onClick={handleShowAll}
              className="ml-2 px-2 py-1 rounded bg-amber-200 text-amber-900 text-xs sm:text-sm font-semibold hover:bg-amber-300 border border-amber-300"
            >
              {showAll ? 'Hide Answers' : 'Show Answers'}
            </Button>
          </div>
          <Button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={`px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-base ${currentPage === totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full px-0 sm:px-4 pb-24 pt-4 bg-gray-50 min-h-screen">
      {showFilterModal && renderFilterModal()}
      {renderHeader()}
      {renderContent()}
      {renderFixedFooter()}
    </div>
  );
};

export default QuestionList;