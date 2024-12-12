

// Define the originalTextMap for storing original text
const originalTextMap = new Map<string, string>();

// Show the HTML page
figma.showUI(__html__, {
  height: 500,
  width: 500,
});

figma.ui.onmessage = async (msg) => {
  const selection = figma.currentPage.selection;

  if (msg.type === "translate") {
    for (const node of selection) {
      if (node.type === "FRAME") {
        const textNodes = node.findAll((child) => child.type === "TEXT") as TextNode[];
        const frameId = node.id;
        console.log("Text nodes found && frameId:", textNodes + "," + frameId);

        if (textNodes.length === 0) {
          figma.notify("No text nodes found in the selected frame.");
          return;
        }

        // Collect text content from all text nodes in the frame
        const texts = textNodes.map((textNode) => ({
          id: textNode.id,
          content: textNode.characters,
          frame_id: frameId,
        }));
        console.log("Extracted texts:", texts);

        // Send the text to the UI
        figma.ui.postMessage({
          type: "frame-selected",
          frameId,
          texts,
        });
        console.log("Message sent to UI: ", {
          type: "frame-selected",
          frameId: node.id,
          texts,
        });

        //store original text before translating
        for (const textNode of textNodes) {
          originalTextMap.set(textNode.id, textNode.characters);
          console.log(`Original text stored: [${textNode.id}] = ${textNode.characters}`);
        }
      }
    }
  }

  if(msg.type === "update-frame-text") {
    const { translations } = msg;  // `translations` is an array of { id, translatedText }
    console.log("translations:", translations);
    
    for (const node of selection) {
      if (node.type === "FRAME") {
        const textNodes = node.findAll((child) => child.type === "TEXT") as TextNode[];

        for (const textNode of textNodes) {
          const translation = translations.find((t) => t.text_id === textNode.id);
          if (translation) {
            try {
              await figma.loadFontAsync(textNode.fontName as FontName);
              originalTextMap.set(textNode.id, textNode.characters);
              console.log("translation.translatedText:", translation.translated_text)
              textNode.characters = translation.translated_text;
            } catch (error) {
              console.warn( `Failes to apply translation for ${textNode.id}:`, error);
            }
          } else { 
            console.warn(`No translation found for text node ${textNode.id}`);
          }
        }
      }
    }
    figma.notify("Text updated with translations.");
  }


  if (msg.type === "toggle-text") {
    const {  frameId, matchedTextNodes, showOriginal } = msg;
    console.log("Show original:", showOriginal);
    console.log("Translated text for toggleing on Figma:", matchedTextNodes);
    console.log("FrameId toggling:", frameId);

    for (const node of selection) {
      if (node.type === "FRAME") {
        const textNodes = node.findAll((child) => {
          return  child.type === "TEXT" }) as TextNode[];
        
        for (const textNode of textNodes) {
          await figma.loadFontAsync(textNode.fontName as FontName);

          const matchedNode = matchedTextNodes.find((mathed) => mathed.text_id === textNode.id);
          if( matchedNode ) {
            if ( showOriginal ) {
              if ( matchedNode.original_text ) {
                textNode.characters = matchedNode.original_text;
                console.log("textNode characters:", textNode.characters);
                
                console.warn(`No original text found for ${textNode.id}`);
              }
            } else {
              textNode.characters = matchedNode.translated_text || "";
              console.log("textNode characters:", textNode.characters);
            }
          } else {
            console.warn(`No matching node found for ${textNode.id}`);
          }

        }
      }
    }
    figma.notify(showOriginal ?
       "Switched to original text" : 
       "Switched to translated text");
  }


  if (msg.type === "cancel") {
    figma.closePlugin();
  }
};

