
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
// figma.showUI(__html__, {
//   height: 500,
//   width: 500,
// });

// const originalTextMap = new Map<string, string>();

// figma.ui.onmessage = async (msg) => {
//   console.log("Message received from UI:", msg);


//   if (msg.type === "translate" || msg.type === "translation-complete") {


//     const selection = figma.currentPage.selection;
//     console.log("Figma selection:", selection); // Log the selection to debug

//     if (msg.type === "translate") {
//       for (const node of selection) {
//         if (node.type === "FRAME") {
//           const textNodes = node.findAll((child) => child.type === "TEXT") as TextNode[];
//           console.log("Node type:", node.type);

//           figma.ui.postMessage({
//             type: "frame-selected",
//             frameId: node.id,
//             texts: textNodes.map((textNode) => ({
//               id: textNode.id,
//               content: textNode.characters,
//             })),
//           });

//           await figma.loadFontAsync({ family: "Inter", style: "Regular" });

//           for (const textNode of textNodes) {
//             // Store the original text in the map before updating
//             originalTextMap.set(textNode.id, textNode.characters);
//           }
//         }
//       }
//     }

//     // Handle completed translation and apply the translated text
//     if (msg.type === "translation-complete") {
//       const { frameId, translatedText } = msg;

//       console.log("Translation-complete received with Frame ID:", frameId);

//       try {
//         const frame = await figma.getNodeByIdAsync(frameId);
//         if (!frame || frame.type !== "FRAME") {
//           console.error(`Frame not found or invalid type for ID: ${frameId}`);
//           figma.notify(`Frame with ID ${frameId} not found.`);
//           return;
//         }

//         const textNodes = frame.findAll((node) => node.type === "TEXT") as TextNode[];
//         console.log(`Found ${textNodes.length} text nodes in frame with ID: ${frameId}`);

//         if (textNodes.length === 0) {
//           figma.notify("No text found to translate in this frame.");
//           return;
//         }

//         for (const textNode of textNodes) {
//           try {
//             await figma.loadFontAsync(textNode.fontName as FontName);
//             textNode.characters = translatedText;

//             console.log(`Updated textNode ${textNode.id} with text: ${translatedText}`);
//             originalTextMap.set(textNode.id, translatedText);
//           } catch (error) {
//             console.error(`Failed to load font or update text for node ${textNode.id}`, error);
//             figma.notify("Error updating text. Check console for details.");
//           }
//         }

//         figma.notify("Text updated with translation.");
//       } catch (error) {
//         console.error("Error applying translation:", error);
//         figma.notify("Failed to apply translation. Check console for details.");
//       }
//     }


//   }


// /////////


// if (msg.type === "edit") {
//   for (const node of selection) {
//     if (node.type === "FRAME") {
//       const textNodes = node.findAll((child) => child.type === "TEXT") as TextNode[];

//       // Select each text node 
//       figma.currentPage.selection = textNodes;
//       figma.viewport.scrollAndZoomIntoView(textNodes);
//       figma.notify("Text is now editable. Click on a text field to type.");
//     }
//   }
// }



// ////////
// if (msg.type === "cancel") {
//   figma.closePlugin();
// }
// };




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
      }
    }
  }

  if (msg.type === "cancel") {
    figma.closePlugin();
  }
};

