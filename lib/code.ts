

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
        console.log("Text nodes found:", textNodes);

        if (textNodes.length === 0) {
          figma.notify("No text nodes found in the selected frame.");
          return;
        }

        // Collect text content from all text nodes in the frame
        const texts = textNodes.map((textNode) => ({
          id: textNode.id,
          content: textNode.characters,
        }));
        console.log("Extracted texts:", texts);

        // Send the text to the UI
        figma.ui.postMessage({
          type: "frame-selected",
          frameId: node.id,
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

  if (msg.type === "translation-complete") {
    const { frameId, translatedText } = msg;
    console.log("Frame ID on Figma:", frameId);
    console.log("Translated text on Figma:", translatedText);

    try {
      const frame = await figma.getNodeByIdAsync(frameId);
      if (!frame || frame.type !== "FRAME") {
        figma.notify(`Frame with ID ${frameId} not found.`);
        return;
      }

      const textNodes = frame.findAll((node) =>
        node.type === "TEXT") as TextNode[];

      if (textNodes.length === 0) {
        figma.notify("No text found to translate in this frame.");
        return;
      }

      // Apply the translated text to the text nodes
      for (const textNode of textNodes) {
        await figma.loadFontAsync(textNode.fontName as fontName);
        textNode.characters = translatedText;
        originalTextMap.set(textNode.id, textNode.translatedText);
      }

      figma.notify("Text updated with translation.");

    } catch (error) {
      console.error("Error applying translation:", error);
      figma.notify("Failed to apply translation. Check console for details.");
    }
  }

  if (msg.type === "toggle-text") {
    const { showOriginal, translatedText, originalText } = msg;
    console.log("Original text:", originalText);
    console.log("Translated text for toggleing on Figma:", translatedText);

    for (const node of selection) {
      if (node.type === "FRAME") {
        const textNodes = node.findAll((child) => {
          return  child.type === "TEXT" }) as TextNode[];
        
        for (const textNode of textNodes) {
          await figma.loadFontAsync(textNode.fontName as FontName);

          // Preserve original styles
          const fontName = textNode.fontName;
          const fontSize = textNode.fontSize;
          const fills = textNode.fills;
          console.log("Font name:", fontName);
          console.log("Font size:", fontSize);
          console.log("Font fill:", fills);


          // Clear the text node content before applying new text
          textNode.characters = "";
          

              if ( showOriginal) {
                console.log("showOriginal:", showOriginal);
                console.log("Original text:", originalText);
                console.log("Translated text:", translatedText);

                if (originalText !== undefined) {
                  textNode.characters = originalText;

                   // Reapply styles
                  textNode.fontName = fontName;
                  textNode.fontSize = fontSize as number;
                  textNode.fills = fills;
                }  else {
                  console.warn(`No original text found for ${textNode.id}`);
                }
              } else {
                console.log("showOriginal for translation:", showOriginal);
                textNode.characters = translatedText || "";

                 // Reapply styles
                textNode.fontName = fontName;
                textNode.fontSize = fontSize as number;
                textNode.fills = fills;
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

