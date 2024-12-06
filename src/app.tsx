import { useEffect, useState } from "preact/hooks";
import { createClient } from "@supabase/supabase-js";
import { translateTextWithAWS } from "./awsTranslateService";
import languages from "./data/languages.json";
import "./app.css";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
export function App() {
  const [language, setLanguage] = useState<string>("en");
  const [originalText, setOriginalText] = useState<string>("");
  const [translatedText, setTranslatedText] = useState<string>("");
  const [frameId, setFrameId] = useState<string | null>(null);
  const [preview, setPreview] =useState<boolean>(false);
  const [currentTextState, setCurrentTextState] = useState<"original" | "translated">("original");
  const [isFirstToggle, setIsFirstToggle] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  const validateLanguage = (language: string): boolean => {
    return languages.some((lang) => lang.code === language);
  }
  
  // Handle receiving messages from Figma
useEffect(() => {
 const handleMessage = async (event: MessageEvent) => {
   console.log("Message received from Figma:", event.data);

   if (event.data?.pluginMessage) {
     const { pluginMessage } = event.data;
     console.log("Plugin message content:", pluginMessage);

     if (pluginMessage?.type === "frame-selected") {
       const frameIdFromMessage = pluginMessage.frameId || null;

        // Extract the text content from the texts array
        const textContents = (pluginMessage.texts || [] )
        .map((textObj: { content: string }) => textObj.content)
        .join(" ");
        setOriginalText(textContents);   
        setFrameId(frameIdFromMessage); 
        
        console.log("language:", language);  

        setLoading(true);
        console.log("spinner state: Loading started");

        try {
          const translated = await translateTextWithAWS(textContents, language);
          setTranslatedText(translated);
          
          parent.postMessage(
            {
              pluginMessage: {
                originalText,
                frameId,
                translatedText: translated,
                language,
              },
            },
            "*"
          );
        } catch (error) {
          console.log("Translation error", error);
        } finally {
          // Hide spinner after translation
          setLoading(false);
          console.log("Spinner state: Loading finished");

        }

      } 
    }
};
  
  window.addEventListener("message", handleMessage);
  
  // Cleanup the event listener on unmount
  return () => {
    window.removeEventListener("message", handleMessage);
  };
}, [language]);


// Trigger translation
const translateText = async () => {
  
  
  try {
    parent.postMessage(
      {
        pluginMessage: {
          type: "translate",
        },
      },
      "*"
    );
  
    setPreview(true); // Enable preview mode
    
  } catch (error) {
    console.log("Translation error", error);
  }
  
};


  const handlePreviewToggle = () => {
    const showOriginal = currentTextState === "translated";
    console.log("translated text for toggleing:", translatedText);

    setCurrentTextState(showOriginal ? "original" : "translated");
    // Send a toggle-text message to the Figma plugin
    parent.postMessage(
      {
        pluginMessage: {
          type: "toggle-text",
          frameId,
          originalText,
          translatedText,
          showOriginal, // true: show original; false: show translated
        },
      },
      "*"
    );
  };




const handleConfirmTranslation = () => {
  if (frameId) {
    createRecord(originalText, frameId, translatedText);
    setCurrentTextState("translated"); // Ensure translated text is active
    parent.postMessage(
      {
        pluginMessage: {
        type: "translation-complete",
        frameId,
        translatedText,
        },
      },
      "*"
    );
    console.log("Confirmed translation and updated Figma.");
  }
};


  const createRecord = async (originalText: string, frameId: string, translatedText: string) => {
    if (!validateLanguage(language)) {
      console.log("Unsupported language selected:", language);
      return;
    }
    try {
      const { data } = await supabase
        .from("translations")
        .insert([{
            frame_id: frameId,
            original_text: originalText,
            translated_text: translatedText,  
            language,
            validated: true,
        }]);
        console.log("Record added:", data);
    } catch (error) {
      console.log("Error adding record:", error);
    }
  }

  // Fetch all translation record
  const getRecord = async () => {
    try {
       const { data } = await supabase
      .from("translations")
      .select("*");
      console.log("Fetched records:", data);
    } catch (error) {
      console.log("Error fetching records:", error);
    }
  }
  
  
  useEffect(()=> {
    getRecord();
  }, [])

  // Handle the toggle click
  const handleToggleClick = () => {
    if (isFirstToggle) {
      handleConfirmTranslation();
      setIsFirstToggle(false); // Disable first toggle behavior after it's used
    } else {
      handlePreviewToggle();
    }
  };



  return (
    <>
      <h2>Gleef Translate</h2>
      <p>Select a frame and translate your text</p>

      <label htmlFor="language-select">Choose a language:</label>
      <select
        id="language-select"
        value={language}
        onChange={(e) => setLanguage(
          (e.target as HTMLSelectElement)
          .value)
        }
      >
       {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
       ))}
      </select>

      <button id="translate-text" 
      onClick={translateText} 
      style={{marginTop: "20px"}}>
        Translate
      </button>

      {loading && (
        <div className="spinner" style={{marginTop: "20px"}}></div>
      )}

      {preview && !loading && (
        <div style={{ marginTop: "20px" }}>
          <h3>Preview Translation</h3>
          <textarea value={translatedText}
          onChange={(e) => setTranslatedText(
            (e.target as HTMLSelectElement)
            .value)}
          style={{ width: "100%", height: "80px", marginBottom: "10px" }}></textarea>
        </div>
      )}

      <label className="toggle-switch">
        <span className="toggle-label-left">
          {currentTextState === "original" ? 
          "Apply to translated text" : "Back to original text"}
        </span>
        <input type="checkbox" 
        checked={currentTextState === "translated"} 
        onChange={handleToggleClick}
        disabled={!translatedText} // Disable toggle if no translation is available
        />
        <span className="slider"></span>
      </label>
                                 
    </>
  );
}





