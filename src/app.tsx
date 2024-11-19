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



   // Handle receiving messages from Figma
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const { pluginMessage } = event.data;
      if (pluginMessage?.type === "originalText") {
        const originalText = pluginMessage.text;
        const frameId = pluginMessage.frameId;

        console.log("Received original text:", originalText, "from frame:", frameId);

        try {
          // Call the AWS translation service
          const translatedText = await translateTextWithAWS(originalText, language);
          console.log("Translated Text:", translatedText);

          // Save the original and translated text in Supabase
          await createRecord(originalText, frameId, translatedText);

          // Send the translated text back to the Figma plugin
          parent.postMessage({ pluginMessage: { type: "translate", text: translatedText } }, "*");
        } catch (error) {
          console.error("Error during translation:", error);
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
  const translateText = () => {
    console.log("Selected language:", language);
    parent.postMessage({ pluginMessage: { type: "getOriginalText" } }, "*");
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

  useEffect(()=> {
    getRecord();
  }, [])


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
