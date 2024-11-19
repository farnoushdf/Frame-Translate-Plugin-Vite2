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


// Helper to convert ReadableStream to a string
async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }

  return result;
}




export async function translateTextWithAWS(text: string, targetLanguage: string): Promise<string> {
    // Construct the prompt for Claude
  const prompt = `Translate the following text to ${targetLanguage}: ${text}`;
    
   //define parameters for model ID
   const params = {
    modelId: modelId,
    body: JSON.stringify({
        inputs: prompt,
        parameters: {
            max_tokens: 200,
        },
    }),
   };

   //Send Req. to AWS
   const command = new InvokeModelCommand(params);

   try {

    const response = await client.send(command);
    console.log("AWS Response:", response);
    const responseBody = await streamToString(response.body as unknown as ReadableStream<Uint8Array>);
    const result = JSON.parse(responseBody);

    // Return the generated translation or fallback text
    return result.generated_text || "Translation failed.";
  } catch (error) {
    console.error("Error during translation:", error);
    return "Translation failed due to an error.";
  }
}