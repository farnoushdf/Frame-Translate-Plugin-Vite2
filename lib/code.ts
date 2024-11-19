// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

import { translateTextWithAWS } from "../src/awsTranslateService";

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
// Show the plugin UI
figma.showUI(__html__, {
  height: 500,
  width: 500,
});

const originalTextMap = new Map<string, string>();
let originalText = "";

figma.ui.onmessage = async (msg) => {
  const selection = figma.currentPage.selection;


  
  if ( msg.type === "getOriginalText") {
    

    for  (const node of selection) {
      if (node.type === "FRAME") {
        // console.log(node);
        const textNodes = node.findAll((child) => child.type === "TEXT") as TextNode[];
        originalText = textNodes.map((textNode) => textNode.characters).join(" ");
        break;
      }
    figma.ui.postMessage({ type: "originalText",frameId: node.id, text: originalText });
  }  
  }



  if (msg.type === "translate") {
     
     const targetLanguage = msg.language;
    


    for (const node of selection) {
      if (node.type === "FRAME") {
        const textNodes = node.findAll((child) => child.type === "TEXT") as TextNode[];

        // The necessary font before changing text
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });

        
      for (const textNode of textNodes) {

        originalText = textNode.characters;



        try {
          const translatedText = await translateTextWithAWS(originalText, targetLanguage);

           // Update the text node with the translated text
            originalTextMap.set(textNode.id, originalText);
            textNode.characters = translatedText;
            figma.notify(`Translated text: ${translatedText}`);
            
        } catch (error) {
          console.log("Error during translation:", error);
          figma.notify("Translation failed. Check the console for details.");
        }
        // try {
        //   //Fetch translation
        //   const response = await fetch(bedrockEndpoint, {
        //     method: "POST",
        //     headers: {
        //       "Content-Type": "application/json",
        //       "Authorization": `AWS4-HMAC-SHA256 Credential=${process.env.VITE_AWS_ACCESS_KEY_ID}/${awsRegion}/bedrock/aws4_request, 
        //       SignedHeaders=host;x-amz-date;x-amz-target, Signature=${process.env.VITE_AWS_SECRET_ACCESS_KEY}`,
        //     },
        //     body: JSON.stringify({
        //       prompt: `Translate the following text to ${targetLanguage}: "${originalText}"`,
        //       max_tokens_to_sample: 1000,
        //       stop_sequences: [],
        //     })
        //   });
        //   const data = await response.json();

        //   const translatedText =
        //          data && data.completion && data.completion[0] && data.completion[0].data
        //          ? data.completion[0].data.text : "Translation failed";

               
        //   // const translatedText = data.completion[0]?.data.text || "Translation failed";
        //   // update text in Figma
        //   originalTextMap.set(textNode.id, textNode.characters);
        //   textNode.characters = translatedText;
        //   figma.notify(`Updated text to: ${translatedText}`);
          
        // } catch (error) {
        //   console.log("Error during translation", error);
        //   figma.notify("Translation failed. Check console for details.");
        // }

        }
      }
    }
  }

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

  if (msg.type === "cancel") {
    figma.closePlugin();
  }
};


