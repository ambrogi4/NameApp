import React, { useState, useRef, useEffect } from 'react';
import { executeNaturalLanguageQuery } from './apiService';

// Check for Web Speech API support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function NaturalLanguageQueryInput({ onResults, onLoading, onError, onClear }) {
  const [query, setQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [lastInterpretation, setLastInterpretation] = useState('');
  const [lastSql, setLastSql] = useState('');
  const [showSql, setShowSql] = useState(false);
  const [confidence, setConfidence] = useState('');
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSubmit = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    onLoading(true);
    onError('');
    setLastInterpretation('');
    setLastSql('');
    setConfidence('');

    try {
      const result = await executeNaturalLanguageQuery(trimmed);
      setLastInterpretation(result.interpretation || '');
      setLastSql(result.sql || '');
      setConfidence(result.confidence || '');
      onResults(result);
    } catch (err) {
      onError(err.message);
    } finally {
      onLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setQuery('');
      setLastInterpretation('');
      setLastSql('');
      setConfidence('');
      onClear();
    }
  };

  const handleClear = () => {
    setQuery('');
    setLastInterpretation('');
    setLastSql('');
    setConfidence('');
    onClear();
  };

  const handlePasteAndGo = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setQuery(text.trim());
        // Submit after state update
        setTimeout(async () => {
          onLoading(true);
          onError('');
          setLastInterpretation('');
          setLastSql('');
          setConfidence('');
          try {
            const result = await executeNaturalLanguageQuery(text.trim());
            setLastInterpretation(result.interpretation || '');
            setLastSql(result.sql || '');
            setConfidence(result.confidence || '');
            onResults(result);
          } catch (err) {
            onError(err.message);
          } finally {
            onLoading(false);
          }
        }, 0);
      }
    } catch (err) {
      console.error('Clipboard read failed:', err);
      onError('Could not read clipboard. Try Ctrl+V into the text field instead.');
    }
  };

  const confidenceColor = {
    high: '#2e7d32',
    medium: '#f57c00',
    low: '#c62828',
  };

  return (
    <div className="nl-query-container">
      <div className="nl-query-input-row">
        <input
          ref={inputRef}
          type="text"
          className="nl-query-input"
          placeholder="Ask a question... e.g., 'Who at Morgan Stanley haven't I contacted in 6 months?'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {SpeechRecognition && (
          <button
            className={`nl-query-mic ${isRecording ? 'recording' : ''}`}
            onClick={toggleVoice}
            title={isRecording ? 'Stop recording' : 'Voice input'}
          >
            {isRecording ? 'Stop' : 'Mic'}
          </button>
        )}
        <button
          className="nl-query-paste"
          onClick={handlePasteAndGo}
          title="Paste from clipboard and submit (use with Windows Speech Recognition)"
        >
          Paste & Go
        </button>
        <button
          className="nl-query-submit"
          onClick={handleSubmit}
          disabled={!query.trim()}
        >
          Ask
        </button>
        {(lastInterpretation || query) && (
          <button className="nl-query-clear" onClick={handleClear} title="Clear">
            Clear
          </button>
        )}
      </div>

      {lastInterpretation && (
        <div className="nl-query-interpretation">
          <span className="nl-interpretation-text">
            Showing: {lastInterpretation}
          </span>
          {confidence && (
            <span
              className="nl-confidence-badge"
              style={{ backgroundColor: confidenceColor[confidence] || '#888' }}
            >
              {confidence}
            </span>
          )}
          <button
            className="nl-show-sql-btn"
            onClick={() => setShowSql(!showSql)}
          >
            {showSql ? 'Hide SQL' : 'Show SQL'}
          </button>
        </div>
      )}

      {showSql && lastSql && (
        <pre className="nl-query-sql">{lastSql}</pre>
      )}
    </div>
  );
}

export default NaturalLanguageQueryInput;
