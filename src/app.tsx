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
  const [originalTextNodes, setOriginalTextNodes] = useState<{ text_id: string; text_content: string }[]>([]);
  const [translatedTextNodes, setTranslatedTextNodes] = useState<{ text_id: string; translated_text: string }[]>([]);
  const [matchedTextNodes, setMatchedTextNodes] = useState<{ text_id: string; original_text: string; translated_text: string | null }[]>([]);
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
        const texts = pluginMessage.texts || []; // Array of text node objects from Figma
        console.log("texts:", texts);
        console.log("frameId:", frameIdFromMessage);
        setFrameId(frameIdFromMessage); 

        // Extract the text (text_id and text_content)
        const extractedTextNodes = texts.map(
          (textObj: { id: string; content: string }) => ({
            text_id: textObj.id,
            text_content: textObj.content,
          }));
        setOriginalTextNodes(extractedTextNodes);
        console.log("Extracted text nodes:", extractedTextNodes);  
        console.log("Original text nodes:", originalTextNodes);  
        
        console.log("language:", language);  

        setLoading(true);
        console.log("spinner state: Loading started");

        try {
          // Translate each text node individually
          const translatedTexts = await Promise.all(
            extractedTextNodes.map(async (node: { text_id: string; text_content: string }) => {
              const translated = await translateTextWithAWS(node.text_content, language);
              return { ...node, translated_text: translated}
            })
          );
          setTranslatedTextNodes(translatedTexts);
          console.log("Translate text nodes:", translatedTexts);
          
          //update matched text nodes
          const updatedMatchedNodes = extractedTextNodes.map((node: { text_id: string; text_content: string }) => {
            const translatedNode = translatedTexts.find(
              (tNode) => tNode.text_id === node.text_id
            );
            return {
              text_id: node.text_id,
              original_text: node.text_content,
              translated_text: translatedNode ? translatedNode.translated_text : null,
            };
          });
          setMatchedTextNodes(updatedMatchedNodes);
          console.log("Updated matched text nodes:", updatedMatchedNodes);

          // Call createRecord to store in the database
         if (frameIdFromMessage) {
           const  data  = await createRecord( frameIdFromMessage, updatedMatchedNodes );
           console.log("Recorded data:", data);
         }
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





// Handle the toggle click
const handleToggleClick = () => {
    if (isFirstToggle) {
      handleConfirmTranslation();
      setIsFirstToggle(false); // Disable first toggle behavior after it's used
    } else {
      handlePreviewToggle();
    }
  };
  
  const handleConfirmTranslation = () => {
    if ( frameId && matchedTextNodes.length > 0 ) {
      console.log("Confirmed translation and sending data to Figma:", matchedTextNodes);

      setCurrentTextState("translated"); // Ensure translated text is active
      
      
      parent.postMessage(
      {
        pluginMessage: {
          type: "update-frame-text",
          frameId,
          translations: matchedTextNodes,
        },
      },
      "*"
    );
    console.log("Confirmed translation and updated Figma.");
  }
};

const handlePreviewToggle = () => {
  const showOriginal = currentTextState === "translated";
  console.log("translated and original text for toggleing:", matchedTextNodes);

  setCurrentTextState(showOriginal ? "original" : "translated");
  // Send a toggle-text message to the Figma plugin
  parent.postMessage(
    {
      pluginMessage: {
        type: "toggle-text",
        frameId,
        matchedTextNodes,
        showOriginal, // true: show original; false: show translated
      },
    },
    "*"
  );
};

  const createRecord = async (
    frameId: string,
    matchedTextNodes: { 
      text_id: string, 
      original_text: string, 
      translated_text: string | null
    }[]
  ) => {
    if (!validateLanguage(language)) {
      console.log("Unsupported language selected:", language);
      return;
    }


    try {
      // Insert text node records into Supabase
    const textNodeInsertions = matchedTextNodes.map((node) => ({
      frame_id: frameId,
      text_node_id: node.text_id,
      original_text: node.original_text,
      translated_text: node.translated_text,
      language,
    }));
    
      const { data, error } = await supabase
        .from("text_nodes")
        .insert(textNodeInsertions);

        if (error) {
          console.log("error adding text nodes:", error);
          return;
        }
        console.log("Text nodes record added:", data);

        //Insert frame data into the frames table
         await supabase
        .from("frames")
        .insert({ frame_id: frameId });
        
    } catch (error) {
      console.log("Error adding record:", error);
    }
  }






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
          <textarea 
          value={translatedTextNodes.map((node) => node.translated_text).join("\n")}
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
        disabled={translatedTextNodes.length === 0} // Disable toggle if no translation is available
        />
        <span className="slider"></span>
      </label>
                                 
    </>
  );
}





