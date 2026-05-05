
import React, { useEffect, useRef, useState } from "react";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/python/python";
import "codemirror/mode/clike/clike";
import "codemirror/theme/dracula.css";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/selection/active-line";
import "codemirror/lib/codemirror.css";
import "../Editor.css";
import CodeMirror from "codemirror";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ACTIONS } from "../Actions";

function Editor({ socketRef, roomId, onCodeChange, selectedLanguage, codeRef }) {
  const editorRef = useRef(null);
  const suggestionRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
  const [showSuggestions, setShowSuggestions] = useState(false);

  const textareaId = `realtimeEditor-${roomId}-${Math.random().toString(36).substring(2, 9)}`;

  const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

  const languageModes = {
    javascript: { name: "javascript", json: true },
    python: "python",
    java: "java",
    cpp: "text/x-c++src",
    c: "text/x-csrc",
  };

  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const fetchSuggestions = async (code, cursorPos) => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `You are a highly intelligent and language-aware code completion assistant. Your task is to first accurately identify the programming language from the code block based on syntax, structure, and keywords. Then, based on the cursor position, predict the most logical next part or line of code. Use your understanding of the language’s grammar, functions, and common patterns to generate accurate completions.

Provide up to 7 concise code completions or suggestions. These can include keywords, complete lines, function names with inferred logic, or short code blocks — always syntactically correct and appropriate to the context. Only respond with a JSON array of these suggestions.

Code:
\`\`\`${selectedLanguage}
${code}
\`\`\`

Cursor at line ${cursorPos.line + 1}, column ${cursorPos.ch}.`;

      const result = await model.generateContent(prompt);
      const response = await result.response.text();

      const jsonStart = response.indexOf("[");
      const jsonEnd = response.lastIndexOf("]");
      if (jsonStart === -1 || jsonEnd === -1) {
        console.error("No JSON array found in the response");
        return [];
      }
      const jsonString = response.slice(jsonStart, jsonEnd + 1);

      let suggestionsArray;
      try {
        suggestionsArray = JSON.parse(jsonString);
      } catch (e) {
        console.error("Parsing failed:", e);
        return [];
      }
      return suggestionsArray.slice(0, 5);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      return [];
    }
  };

  const debouncedFetchSuggestions = useRef(
    debounce(async (code, cursorPos) => {
      const suggestions = await fetchSuggestions(code, cursorPos);
      setSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    }, 500)
  ).current;

  const updateSuggestionPosition = (editor) => {
    const cursor = editor.getCursor();
    const coords = editor.cursorCoords(true, "local");
    const editorWrapper = editor.getWrapperElement();
    const editorBounds = editorWrapper.getBoundingClientRect();
    const suggestionWidth = 300;
    const suggestionHeight = 200;
    const offset = 5;

    let top = coords.bottom + offset;
    let left = coords.left;

    if (top + suggestionHeight > editorWrapper.offsetHeight) {
      top = coords.top - suggestionHeight - offset;
    }
    if (left + suggestionWidth > editorWrapper.offsetWidth) {
      left = editorWrapper.offsetWidth - suggestionWidth;
    }
    if (left < 0) {
      left = 0;
    }

    top += editorBounds.top - window.scrollY;
    left += editorBounds.left - window.scrollX;

    setSuggestionPosition({ top, left });
  };

  useEffect(() => {
    let editor = null;
    const init = async () => {
      const textarea = document.getElementById(textareaId);
      if (!textarea) {
        console.error(`Textarea with id '${textareaId}' not found`);
        return;
      }

      const existingEditor = textarea.CodeMirror;
      if (existingEditor) {
        console.warn("Existing CodeMirror instance found, cleaning up:", textareaId);
        existingEditor.toTextArea();
      }

      if (editorRef.current) {
        console.warn("Editor already initialized for textarea:", textareaId);
        return;
      }

      editor = CodeMirror.fromTextArea(textarea, {
        mode: languageModes[selectedLanguage] || languageModes.javascript,
        theme: "dracula",
        autoCloseTags: true,
        autoCloseBrackets: true,
        lineNumbers: true,
        multipleSelections: false,
        matchBrackets: true,
        styleActiveLine: true,
      });
      editorRef.current = editor;

      editor.setSize(null, "100%");
      editor.setValue(codeRef.current || "");

      editor.on("change", (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        console.log("Editor change:", { roomId, code, origin });
        onCodeChange(code);
        if (origin !== "setValue" && socketRef.current && socketRef.current.connected) {
          socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code,
          });
          console.log("Emitted CODE_CHANGE:", { roomId, code });
        } else if (!socketRef.current || !socketRef.current.connected) {
          console.warn("Socket not connected, cannot emit CODE_CHANGE");
        }

        const cursor = instance.getCursor();
        debouncedFetchSuggestions(code, cursor);
        updateSuggestionPosition(instance);
      });

      editor.on("cursorActivity", (instance) => {
        if (showSuggestions) {
          updateSuggestionPosition(instance);
        }
      });

      editor.on("keyHandled", (instance, name, event) => {
        if (showSuggestions && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
          event.preventDefault();
          const highlighted = suggestionRef.current?.querySelector(".suggestion-highlighted");
          let next;
          if (event.key === "ArrowDown") {
            next = highlighted ? highlighted.nextSibling : suggestionRef.current?.firstChild;
          } else {
            next = highlighted ? highlighted.previousSibling : suggestionRef.current?.lastChild;
          }
          if (next) {
            highlighted?.classList.remove("suggestion-highlighted");
            next.classList.add("suggestion-highlighted");
          }
        } else if (showSuggestions && event.key === "Enter") {
          event.preventDefault();
          const highlighted = suggestionRef.current?.querySelector(".suggestion-highlighted");
          if (highlighted) {
            const suggestion = highlighted.textContent;
            const cursor = instance.getCursor();
            instance.replaceRange(suggestion, cursor);
            setShowSuggestions(false);
            setSuggestions([]);
          }
        } else if (event.key === "Escape") {
          setShowSuggestions(false);
          setSuggestions([]);
        }
      });

      console.log("Editor initialized for textarea:", textareaId);
    };

    const setupEditor = () => {
      if (socketRef.current && socketRef.current.connected) {
        init();
      } else {
        console.log("Waiting for socket connection before initializing editor");
        const connectHandler = () => {
          console.log("Socket connected, initializing editor");
          init();
          socketRef.current.off("connect", connectHandler);
        };
        socketRef.current?.on("connect", connectHandler);
      }
    };

    setupEditor();

    return () => {
      if (editorRef.current) {
        editorRef.current.toTextArea();
        editorRef.current = null;
        console.log("Editor cleaned up for textarea:", textareaId);
      }
    };
  }, [roomId, socketRef, onCodeChange, selectedLanguage, codeRef]);

  useEffect(() => {
    if (editorRef.current) {
      const currentCode = editorRef.current.getValue();
      editorRef.current.setOption("mode", languageModes[selectedLanguage] || languageModes.javascript);
      editorRef.current.setValue(currentCode);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    if (!socketRef.current) {
      console.warn("socketRef.current is null, skipping CODE_CHANGE listener setup");
      return;
    }

    const handleCodeChange = ({ code }) => {
      if (editorRef.current && typeof code === 'string' && code !== editorRef.current.getValue()) {
        const currentCursor = editorRef.current.getCursor();
        console.log("Received CODE_CHANGE:", { roomId, code });
        editorRef.current.setValue(code);
        editorRef.current.setCursor(currentCursor);
        if (showSuggestions) {
          updateSuggestionPosition(editorRef.current);
        }
        onCodeChange(code);
      } else {
        console.log("Skipping CODE_CHANGE: invalid code or unchanged", { code, editorValue: editorRef.current?.getValue() });
      }
    };

    socketRef.current.on(ACTIONS.CODE_CHANGE, handleCodeChange);
    console.log("Registered CODE_CHANGE listener for room:", roomId);

    return () => {
      if (socketRef.current) {
        socketRef.current.off(ACTIONS.CODE_CHANGE, handleCodeChange);
        console.log("Unregistered CODE_CHANGE listener for room:", roomId);
      }
    };
  }, [socketRef, showSuggestions, roomId, onCodeChange]);

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <textarea id={textareaId}></textarea>
      {showSuggestions && suggestions.length > 0 && (
        <ul
          ref={suggestionRef}
          className="suggestion-box"
          style={{
            position: "fixed",
            top: `${suggestionPosition.top}px`,
            left: `${suggestionPosition.left}px`,
          }}
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              className={`suggestion-item ${index === 0 ? "suggestion-highlighted" : ""}`}
              onClick={() => {
                const cursor = editorRef.current?.getCursor();
                if (cursor) {
                  editorRef.current.replaceRange(suggestion, cursor);
                  setShowSuggestions(false);
                  setSuggestions([]);
                  editorRef.current.focus();
                }
              }}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Editor;