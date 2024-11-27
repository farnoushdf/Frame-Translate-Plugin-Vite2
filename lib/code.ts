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

        if (textNodes.length === 0) {
          figma.notify("No text nodes found in the selected frame.");
          return;
        }

        // Collect text content from all text nodes in the frame
        const texts = textNodes.map((textNode) => ({
          id: textNode.id,
          content: textNode.characters,
        }));

        // Send the text to the UI
        figma.ui.postMessage({
          type: "frame-selected",
          frameId: node.id,
          texts,
        });

        //store original text before translating
        for (const textNode of textNodes) {
          originalTextMap.set(textNode.id, textNode.characters);
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
      if ( !frame || frame.type !== "FRAME") {
        figma.notify(`Frame with ID ${frameId} not found.`);
        return;
      }

      const textNodes = frame.findAll((node) => node.type ==="TEXT") as TextNode[];

      if ( textNodes.length === 0 ){
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

  if (msg.type === "cancel") {
    figma.closePlugin();
  }
};

