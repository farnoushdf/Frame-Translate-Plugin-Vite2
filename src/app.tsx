import { useEffect, useState } from "preact/hooks";
import { createClient } from "@supabase/supabase-js";
import { translateTextWithAWS } from "./awsTranslateService";
import "./app.css";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
export function App() {
  const [language, setLanguage] = useState<string>("en");

  const validateLanguage = (language: string): boolean => {
    const supportedLanguage = ["en", "es", "fr", "de"];
    return supportedLanguage.includes(language);
  }
  
  // Handle receiving messages from Figma
useEffect(() => {
 const handleMessage = async (event: MessageEvent) => {
   console.log("Message received from Figma:", event.data);

   
const testingText = await translateTextWithAWS("Hello, how are you?", "German");
console.log("Translated text for testing:", testingText);


   if (event.data?.pluginMessage) {
     const { pluginMessage } = event.data;

     
     console.log("Plugin message content:", pluginMessage);

     if (pluginMessage?.type === "frame-selected") {
       
       const frameId = pluginMessage.frameId || null;
       const originalText = pluginMessage.originalText || "Hello, how are you?";

       console.log("Frame ID:", frameId);
       console.log("Texts received:", originalText);

      if (originalText.length > 0) {
          try {
            // Translate the text
            const translatedText = await translateTextWithAWS(originalText, language);
            console.log("Translated text:", translatedText);

            // Send translated text back to the Figma code.ts environment
            parent.postMessage(
              { pluginMessage: {type: "translation-complete", frameId , translateText}}, 
            "*"
          );

            // Save the translation record to Supabase
            await createRecord(originalText, frameId , translatedText);
            console.log("Record saved to Supabase successfully.");
          } catch (error) {
            console.error("Error during translation or saving record:", error);
          }
        } else {
          console.log("No text selected.");
        }
      } else {
        console.log("Unhandled plugin message type:", pluginMessage?.type);
      }
    }
 };

 window.addEventListener("message", handleMessage);

 // Cleanup the event listener on unmount
 return () => {
   window.removeEventListener("message", handleMessage);
 };
}, []);

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
    console.log("Selected language:", language);
    console.log("Sending message to get original text");
    parent.postMessage({ pluginMessage: { type: "translate",language  } }, "*");
  };

  function editText() {
    parent.postMessage({ pluginMessage: { type: "edit" } }, "*");
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

      <button id="translate-text" onClick={translateText}>Translate</button>
      <button id="edit-text" onClick={editText}>Edit</button>
      <button id="cancel" onClick={handleCancel}>Cancel</button>
    </>
  );
}
