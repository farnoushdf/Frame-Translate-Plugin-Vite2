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
}}
};
  
  window.addEventListener("message", handleMessage);
  
  // Cleanup the event listener on unmount
  return () => {
    window.removeEventListener("message", handleMessage);
  };
}, [language]);


// Trigger translation
const translateText = async () => {
  
  setPreview(true);
 
parent.postMessage(
  {
    pluginMessage: {
      type: "translate",
    },
  },
  "*"
);
};

const handleConfirmTranslation = () => {
  if (frameId) {
    createRecord(originalText, frameId, translatedText);
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
  }
  setPreview(false);
};


 const undoTextChange = () => {
    const showOriginal = currentTextState === "translated";
    parent.postMessage(
      {
        pluginMessage: {
          type: "toggle-text",
          frameId,
          showOriginal,
        },
      },
      "*"
    );
    const newState = showOriginal ? "original" : "translated";
    setCurrentTextState(newState);
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

      <button id="translate-text" onClick={translateText}>Translate</button>
      <button onClick={undoTextChange}>Undo</button>
      {preview && (
        <div>
          <h3>Preview Translation</h3>
          <textarea value={translatedText}
          onChange={(e) => setTranslatedText(
            (e.target as HTMLSelectElement)
            .value)}
          style={{ width: "100%", height: "80px" }}></textarea>
          <button onClick={handleConfirmTranslation}>Confirm</button>
        </div>
      )}
    </>
  );
}





