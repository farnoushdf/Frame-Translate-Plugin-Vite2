
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
figma.showUI(__html__, {
  height: 500,
  width: 500,
});

const originalTextMap = new Map<string, string>();

figma.ui.onmessage = async (msg) => {
  console.log("Message received from UI:", msg);


  if (msg.type === "translate") {


    const selection = figma.currentPage.selection;
    console.log("Figma selection:", selection); // Log the selection to debug

    for (const node of selection) {
      if (node.type === "FRAME") {
        const textNodes = node.findAll((child) => child.type === "TEXT") as TextNode[];

        figma.ui.postMessage({
          type: "frame-selected",
          frameId: node.id,
          texts: textNodes.map((textNode) => ({
            id: textNode.id,
            content: textNode.characters,
          })),
        })

        await figma.loadFontAsync({ family: "Inter", style: "Regular" });

        for (const textNode of textNodes) {

          // Store the original text in the map before updating
          originalTextMap.set(textNode.id, textNode.characters);

        }
      }
    }
  }

  if (msg.type === "translation-complete") {
    const { frameId, translatedText } = msg;

    try {
      const frame = figma.getNodeById(frameId) as FrameNode;
      if (!frame) throw new Error(`Frame with ID ${frameId} not found.`);

      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      textNode.characters = translatedText;

      figma.notify("Text updated with translation.");

    } catch (error) {
      console.error("Error applying translation:", error);
      figma.notify("Failed to apply translation. Check console for details.");
    }
  }


/////////


if (msg.type === "edit") {
  for (const node of selection) {
    if (node.type === "FRAME") {
      const textNodes = node.findAll((child) => child.type === "TEXT") as TextNode[];

      // Select each text node 
      figma.currentPage.selection = textNodes;
      figma.viewport.scrollAndZoomIntoView(textNodes);
      figma.notify("Text is now editable. Click on a text field to type.");
    }
  }
}



////////
if (msg.type === "cancel") {
  figma.closePlugin();
}
};


