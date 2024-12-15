

// Define the originalTextMap for storing original text
const originalTextMap = new Map<string, string>();

// To store the frame node globally for reference
let activeFrame: FrameNode | null = null;

// Show the HTML page
figma.showUI(__html__, {
  height: 500,
  width: 500,
});

figma.ui.onmessage = async (msg) => {
  const selection = figma.currentPage.selection;

  // Function to dynamically get the active frame
  const getActiveFrame = (): FrameNode | null => {
    for (const node of selection) {
      if (node.type === "Frame") {
        return node;
      }
    }
    return null;
  };

  if (msg.type === "translate") {
    for (const node of selection) {
      if (node.type === "FRAME") {
        activeFrame = node; // Store the user-selected frame
        const textNodes = node.findAll((child) => child.type === "TEXT") as TextNode[];
        const frameId = node.id;
        console.log("Text nodes found && frameId:", textNodes, frameId);

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

        // Store original text before translating
        for (const textNode of textNodes) {
          originalTextMap.set(textNode.id, textNode.characters);
          console.log(`Original text stored: [${textNode.id}] = ${textNode.characters}`);
        }
      }
    }
  }

  if (msg.type === "update-frame-text") {
    const { translations } = msg; // `translations` is an array of { id, translatedText }
    console.log("Updating Figma text nodes with translations::", translations);

    for (const node of selection) {
      if (node.type === "FRAME") {
        const textNodes = node.findAll((child) => child.type === "TEXT") as TextNode[];

        for (const textNode of textNodes) {
          const translation = translations.find((t) => t.text_id === textNode.id);
          if (translation) {
            try {
              await figma.loadFontAsync(textNode.fontName as FontName);
              originalTextMap.set(textNode.id, textNode.characters);
              console.log("translation.translatedText:", translation.translated_text);
              textNode.characters = translation.translated_text;
            } catch (error) {
              console.warn(`Failed to apply translation for ${textNode.id}:`, error);
            }
          } else {
            console.warn(`No translation found for text node ${textNode.id}`);
          }
        }

        // Select each text node
        figma.currentPage.selection = textNodes;
        figma.viewport.scrollAndZoomIntoView(textNodes);
        figma.notify("Text is now editable. Click on a text field to type.");
      }
    }
    figma.notify("Frame updated with translations.");
  }

  if (msg.type === "toggle-text") {
    const { frameId, matchedTextNodes, validate } = msg;
    console.log("Show validate:", validate);
    console.log("Translated text for toggling on Figma:", matchedTextNodes);
    console.log("FrameId toggling:", frameId);

    if (!activeFrame || activeFrame.id !== frameId) {
      activeFrame = getActiveFrame();
    }

    if (!activeFrame) {
      figma.notify("No active frame found. Please select a frame first.");
      return;
    }

    console.log("active frame:", activeFrame);

    const textNodesToToggle = activeFrame.findAll((child) => child.type === "TEXT") as TextNode[];
    // const textNodesToToggle = textNodes;
    console.log("textNodesToToggle:", textNodesToToggle);
    // console.log("active frame textNodes:", textNodes);

    if (validate) {
      if (textNodesToToggle.length === 0) {
        figma.notify("No text nodes found in the selected frame.");
        return;
      }

      // Collect text content from all text nodes in the frame
      const editedTexts = textNodesToToggle.map((textNode) => ({
        id: textNode.id,
        content: textNode.characters,
      }));
      console.log("Extracted edited texts in Figma:", editedTexts);

      // Send the text to the UI
      console.log("Sending validated translation with frameId:",
         frameId, "and edited texts:",
         editedTexts);

      const originalTexts = matchedTextNodes.map((textNode) => ({
        id: textNode.text_id,
        content: textNode.original_text,
      }))   
      console.log("Validated original text:", originalTexts);
      figma.ui.postMessage({
        type: "validated-translation",
        frameId,
        editedTexts,
        originalTexts,
      });
    } else {
       for (const textNode of matchedTextNodes) {
          const originalText = textNode.original_text; // Access original text
          const nodeId = textNode.text_id;
      
          // Find the corresponding TextNode in Figma by its ID
          const figmaTextNode = textNodesToToggle.find((node) => node.id === nodeId);
          if (figmaTextNode) {
            try {
              await figma.loadFontAsync(figmaTextNode.fontName as FontName);
              figmaTextNode.characters = originalText; // Set the original text
              console.log(`Reverted text node [${nodeId}] to original: ${originalText}`);
            } catch (error) {
              console.warn(`Failed to revert text node [${nodeId}]:`, error);
            }
          } else {
            console.warn(`No matching text node found for ID: ${nodeId}`);
          }
        }
      }
    figma.notify(validate ? "Validated translated texts" : "Cancelled translated texts");

    // Zoom back to the active frame after toggling
    if (activeFrame) {
      figma.viewport.scrollAndZoomIntoView([activeFrame]);
    }
  }

  if (msg.type === "cancel") {
    figma.closePlugin();
  }
};
