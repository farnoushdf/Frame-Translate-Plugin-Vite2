import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";


const client = new BedrockRuntimeClient({
  region: "eu-central-1",
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

// Define the modelId for Claude 3 (Sonnet)
const modelId = "eu.anthropic.claude-3-5-sonnet-20240620-v1:0";


export async function translateTextWithAWS(text: string, targetLanguage: string): Promise<string> {
  // Construct the prompt configuration similar to the Python structure
  console.log("Calling AWS Bedrock with text:", text, "Target language:", targetLanguage);

  const promptConfig = {
    anthropic_version: "bedrock-2023-05-31",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `Translate the following text to ${targetLanguage}: ${text}`, },
        ],
      },
    ],
    max_tokens: 4096,
  };

  const params = {
    modelId,
    body: JSON.stringify(promptConfig),
    contentType: "application/json",
    accept: "application/json",
  };

  const command = new InvokeModelCommand(params);

  try {
    const response = await client.send(command);
    console.log("AWS Response:", response);

    if (response.body) {
      const decoder = new TextDecoder("utf-8");
      const decodeResponse = decoder.decode(response.body as Uint8Array);

      const responseBody = JSON.parse(decodeResponse);
      console.log("Decoded AWS Response:", responseBody);


      if (responseBody.content && responseBody.content.length > 0) {
        const translatedText = responseBody.content[0].text;
        return translatedText || "Translation failed.";
      } else {
        console.warn("No translation content found in the response.");
        return "Translation content is missing.";
      }
    } else {
      console.warn("No response body received from the model.");
      return "No response body received.";
    }
  } catch (error) {
    console.error("Error during translation:", error);
    return "Translation failed due to an error.";
  }
}