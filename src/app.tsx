import { useEffect, useState } from "preact/hooks";
import { createClient } from "@supabase/supabase-js";
import { translateTextWithAWS } from "./awsTranslateService";
// import languages from "./data/languages.json";
import "./app.css";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
export function App() {
  const [language, setLanguage] = useState<string>("en");
  const [originalText, setOriginalText] = useState<string>("");
  const [translatedText, setTranslatedText] = useState<string>("");
  const [frameId, setFrameId] = useState<string>("");
  const [showTextAreas, setShowTextAreas] = useState<boolean>(false);
  // const [searchQuery, setSearchQuery] = useState<string>("");


  const validateLanguage = (language: string): boolean => {
    const supportedLanguage = ["en", "es", "fr", "de"];
    return supportedLanguage.includes(language);
  }
  
  // Handle receiving messages from Figma
useEffect(() => {
 const handleMessage = async (event: MessageEvent) => {
   console.log("Message received from Figma:", event.data);

   if (event.data?.pluginMessage) {
     const { pluginMessage } = event.data;
     console.log("Plugin message content:", pluginMessage);

     if (pluginMessage?.type === "frame-selected") {
      //  const frameIdFromMessage = pluginMessage.frameId || null;
       setFrameId(pluginMessage.frameId || "");
      //  const textContents = pluginMessage.texts;

        // Extract the text content from the texts array
        const textContents = pluginMessage.texts.map((textObj: { content: string }) => textObj.content).join(" ");
        setOriginalText(textContents);    

    
     
    console.log("language:", language);
    console.log("Original text:", textContents);

    if (textContents.trim() !== "") {

      // Call AWS translation service
      const translatedText = await translateTextWithAWS(textContents, language);
      setTranslatedText(translatedText);
      setShowTextAreas(true); 
  
      // Create a record in the database
      createRecord(originalText, frameId, translatedText);
    } else {
      console.warn("No original text available to translate.");
    }

    


        //  if (textContents.length > 0) {
        //   const textToTranslate = textContents
        //     .map((textObj: { content: string }) => textObj.content)
        //     .join(" ");
        //   setOriginalText(textToTranslate);
        //   setTranslatedText(""); // Reset translated text
        //   setFrameId(frameIdFromMessage);
        // }
      } 
    }
 };

 window.addEventListener("message", handleMessage);

 // Cleanup the event listener on unmount
 return () => {
   window.removeEventListener("message", handleMessage);
 };
}, [language]);

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

  

    // Trigger translation
  const translateText = () => {
     
    parent.postMessage(
      {
        pluginMessage: {
          type: "translate",
        },
      },
      "*"
    );
  };

  function handleCancel() {
    parent.postMessage({ pluginMessage: { type: "cancel" } }, "*");
  };

   const handleLanguageChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    setLanguage(target.value);
  };



  return (
    <>
      <h2>"Gleef Translate"</h2>
      <p>Select a frame and translate the text to "Gleef Translate"</p>

      <label htmlFor="language-select">Choose a language:</label>
      <select
        id="language-select"
        value={language}
        onChange={handleLanguageChange}
      >
        <option value="en">English</option>
        <option value="es">Spanish</option>
        <option value="fr">French</option>
        <option value="de">German</option>
      </select>

      <br />

      <button id="translate-text" onClick={translateText}>Translate</button>
    
      <button id="cancel" onClick={handleCancel}>Cancel</button>

      {showTextAreas && (
        <div style={{ marginTop: "20px" }}>
          <h3>Original Text</h3>
          <textarea
            value={originalText}
            onChange={(e) => setOriginalText((e.target as HTMLTextAreaElement).value)}
            style={{ width: "100%", height: "100px" }}
          ></textarea>

          <h3>Translated Text</h3>
          <textarea
            value={translatedText}
            readOnly
            style={{ width: "100%", height: "100px" }}
          ></textarea>
        </div>
      )}
    </>
  );
}





