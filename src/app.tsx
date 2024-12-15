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
  const [currentTextState, setCurrentTextState] = useState<"validated" | "canceled">("canceled");
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

          // Confirm translations and send to Figma for immediate update
          parent.postMessage(
            {
              pluginMessage: {
                type: "update-frame-text", // Use update-frame-text action
                frameId,
                translations: updatedMatchedNodes,
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

      // Handle validated-translation message
      if (pluginMessage?.type === "validated-translation") {
        const { frameId, editedTexts, originalTexts } = pluginMessage;
        console.log("Edited texts from Figma:", editedTexts);
        console.log("Original texts from Figma:", originalTexts);

        const extractedEditedTextNodes = editedTexts.map(
          (textObj: { id: string; content: string }) => ({
            text_id: textObj.id,
            text_content: textObj.content,
            frame_id: frameId,
          })
        );
        const extractedOriginalTextNodes = originalTexts.map(
          (textObj: { id: string; content: string }) => ({
            text_id: textObj.id,
            text_content: textObj.content,
            frame_id: frameId,
          })
        );
        const matchedTextNodes = extractedOriginalTextNodes.map((node: { text_id: string; text_content: string }) => {
            const editedNodes = extractedEditedTextNodes.find(
              (tNode: { text_id: string; text_content: string }) => tNode.text_id === node.text_id
            );
            return {
              text_id: node.text_id,
              original_text: node.text_content,
              translated_text: editedNodes ? editedNodes.text_content : null,
            };
          });

        
        console.log("Updated validated text nodes:", matchedTextNodes);
        console.log("Current frame id:", frameId);

        try {
          // Call createRecord to store in the database
          if (frameId && matchedTextNodes.length > 0) {
            const data = await createRecord(frameId, matchedTextNodes);
            console.log("Recorded data:", data);
          }
        } catch (error) {
          console.error("Error storing validated translations:", error);
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
  
  
      setLoading(true); // Show spinner during translation process

      try {
        // Confirm translations and send to Figma for immediate update
        parent.postMessage(
          {
            pluginMessage: {
              type: "translate", // Use update-frame-text action
              frameId,
              translations: matchedTextNodes,
            },
          },
          "*"
        );

      // setCurrentTextState("translated"); // Update state to reflect the change
      console.log("Translations sent to Figma and frame updated.");
    } catch (error) {
      console.error("Error updating Figma with translations:", error);
    } finally {
      setLoading(false); // Hide spinner after updating
    }
  
  
};


const handleToggleClick = () => {
  const validate = currentTextState === "canceled";
  console.log("translated and original text for toggleing:", matchedTextNodes);

  setCurrentTextState(validate ? "validated" : "canceled");
  // Send a toggle-text message to the Figma plugin
  parent.postMessage(
    {
      pluginMessage: {
        type: "toggle-text",
        frameId,
        matchedTextNodes,
        validate, // true: show original; false: show translated
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
    
    console.log("Frmae ID for adding to Supabase:", frameId);
    console.log("Matechet text nodes for adding to Supabase:", matchedTextNodes);
    
    
    try {
      //Insert frame data into the frames table
      const { error: frameError } = await supabase
      .from("frames")
      .upsert({ frame_id: frameId }, { onConflict: "frame_id" });
      console.log("New frame added");

      if (frameError) {
      console.log("Error adding/updating frame:", frameError);
      return;
      }

      
      // Insert text node records into Supabase
      const textNodeInsertions = matchedTextNodes.map((node) => ({
        frame_id: frameId,
        text_node_id: node.text_id,
        original_text: node.original_text,
        translated_text: node.translated_text,
        language,
      }));
      
      const { data: textData, error: textError } = await supabase
      .from("text_nodes")
      .upsert(textNodeInsertions, { onConflict: "text_node_id" });
      console.log("New text nodes added", textData);
      
      if (textError) {
        console.log("error adding/updating text nodes:", textError);
        return;
      }
      console.log("Text nodes record added:", textData);
      
      
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
                                                     
      <label className="toggle-switch">
        <span className="toggle-label-left">
          {currentTextState === "canceled" ? 
          "Validate Translation" : "Revert to original text"}
        </span>
        <input type="checkbox" 
        checked={currentTextState === "validated"} 
        onChange={handleToggleClick}
        disabled={translatedTextNodes.length === 0} // Disable toggle if no translation is available
        />
        <span className={`slider ${currentTextState === "validated" ? "green" : "orange"}`}></span>
      </label>
                                 
    </>
  );
}





