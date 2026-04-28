import React, { useState, useEffect, useRef } from 'react';

/**
 * A specialized input component that provides Google Transliteration (English -> Gujarati)
 */
const GujaratiInput = ({ 
    value, 
    onChange, 
    placeholder, 
    className, 
    style, 
    onKeyDown,
    onOriginal, // New prop to send back original English text
    required = false,

    type = "text"
}) => {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [shadowValue, setShadowValue] = useState(""); // Stores English-only version
    const [cursorPos, setCursorPos] = useState(0);
    const inputRef = useRef(null);
    const suggestionRef = useRef(null);

    const fetchSuggestions = async (text) => {
        if (!text || text.trim() === "") {
            setSuggestions([]);
            return;
        }

        const words = text.split(' ');
        const lastWord = words[words.length - 1];

        if (!lastWord || lastWord.length < 1) {
            setSuggestions([]);
            return;
        }

        try {
            const url = `https://www.google.com/inputtools/request?text=${encodeURIComponent(lastWord)}&ime=transliteration_en_gu&num=5`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data[0] === "SUCCESS" && data[1][0][1]) {
                setSuggestions(data[1][0][1]);
            }
        } catch (error) {
            console.error("Transliteration error:", error);
        }
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        const selectionStart = e.target.selectionStart;
        
        // Robust English Tracking:
        // We split by spaces and update only the current word being typed
        const gujWords = val.split(' ');
        const engWords = shadowValue.split(' ');
        
        let newShadow = shadowValue;
        // Simple logic: if the word count dropped, slice the shadow words
        if (gujWords.length < engWords.length) {
            newShadow = engWords.slice(0, gujWords.length).join(' ');
        } else {
            const lastGujWord = gujWords[gujWords.length - 1];
            // If the user is typing English or clearing the current word
            if (/[a-zA-Z]/.test(lastGujWord) || lastGujWord === "" || val.endsWith(' ')) {
                engWords[gujWords.length - 1] = lastGujWord;
                newShadow = engWords.slice(0, gujWords.length).join(' ');
            }
        }
        
        // Clean up and Capitalize
        const capitalizedShadow = newShadow.split(' ').map(word => 
            word ? (word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) : ""
        ).join(' ');

        setShadowValue(capitalizedShadow);
        onChange(val);
        if (onOriginal) onOriginal(capitalizedShadow);
        
        setCursorPos(selectionStart);
        fetchSuggestions(val);
        setShowSuggestions(true);
    };

    const selectSuggestion = (suggestion) => {
        const words = value.split(' ');
        const originalWord = words[words.length - 1];
        words[words.length - 1] = suggestion;
        const newVal = words.join(' ') + ' ';
        
        onChange(newVal);
        
        // Keep the original English word in shadow value
        const engWords = shadowValue.split(' ');
        if (/[a-zA-Z]/.test(originalWord)) {
            engWords[words.length - 1] = originalWord;
        }
        const finalShadow = engWords.join(' ').trimEnd() + ' ';
        
        setShadowValue(finalShadow);
        if (onOriginal) onOriginal(finalShadow.trim());

        setSuggestions([]);
        setShowSuggestions(false);
        inputRef.current.focus();
    };




    const handleKeyDownInternal = (e) => {
        if (showSuggestions && suggestions.length > 0) {
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                selectSuggestion(suggestions[0]);
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
            }
        }
        if (onKeyDown) onKeyDown(e);
    };

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionRef.current && !suggestionRef.current.contains(event.target) && 
                inputRef.current && !inputRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <input
                ref={inputRef}
                type={type}
                className={className}
                style={style}
                placeholder={placeholder}
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleKeyDownInternal}
                onFocus={() => value && fetchSuggestions(value) && setShowSuggestions(true)}
                required={required}
                autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
                <ul 
                    ref={suggestionRef}
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        width: 'max-content',
                        minWidth: '100%',
                        background: '#1e1e2e', // Dark professional background
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        zIndex: 9999, // Extremely high to stay on top
                        listStyle: 'none',
                        margin: '4px 0 0 0',
                        padding: '4px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                        maxHeight: '200px',
                        overflowY: 'auto'
                    }}
                >
                    {suggestions.map((s, i) => (
                        <li 
                            key={i}
                            onClick={() => selectSuggestion(s)}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                color: '#ffffff',
                                borderBottom: i === suggestions.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                background: i === 0 ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                fontSize: '1.1rem', // Bigger for easier reading
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = i === 0 ? 'rgba(99, 102, 241, 0.2)' : 'transparent'}
                        >
                            <span>{s}</span>
                            {i === 0 && <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '12px' }}>[ENTER]</span>}
                        </li>
                    ))}
                </ul>

            )}
        </div>
    );
};

export default GujaratiInput;
