
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { ImageQuality } from "../types";

// Initialize the client with the API key from the environment
// Note: Global instance might use stale key if loaded before key selection
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a reference image from a text prompt using Imagen 3.
 * Model: imagen-4.0-generate-001
 */
export const generateReferenceImage = async (
  prompt: string,
  aspectRatio: string = '1:1'
): Promise<{ url: string; mimeType: string }> => {
  try {
    // Use fresh instance for reliability
    const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await currentAi.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: aspectRatio as any, // Cast to match SDK type if needed, assumes string validity
        outputMimeType: 'image/png',
      },
    });

    const generatedImage = response.generatedImages?.[0]?.image;
    if (generatedImage && generatedImage.imageBytes) {
      const mimeType = 'image/png';
      const url = `data:${mimeType};base64,${generatedImage.imageBytes}`;
      return { url, mimeType };
    }

    throw new Error("No image data returned from Imagen.");
  } catch (error) {
    console.error("Error generating reference image:", error);
    throw error;
  }
};

/**
 * Generates a new image based on an input image and a specific angle prompt.
 * Uses the 'gemini-2.5-flash-image' (30DayNanoBanana) model.
 */
export const generateAngleImage = async (
  base64Image: string,
  mimeType: string,
  angleName: string,
  aspectRatio: string = '1:1',
  quality: ImageQuality = 'medium'
): Promise<string> => {
  try {
    const cleanBase64 = base64Image.includes('base64,') 
      ? base64Image.split('base64,')[1] 
      : base64Image;

    let qualityPrompt = "";
    switch (quality) {
        case 'low':
            qualityPrompt = "Create a simple, standard quality generation.";
            break;
        case 'high':
            qualityPrompt = "Ensure high resolution, sharp details, and photorealistic textures. 8k quality.";
            break;
        case 'medium':
        default:
            qualityPrompt = "Ensure standard photorealistic quality.";
            break;
    }

    const prompt = `Generate a photorealistic image of the subject shown in the input image. 
    The new image must be from a ${angleName}. 
    The output image must have an aspect ratio of ${aspectRatio}.
    ${qualityPrompt}
    Maintain the exact same character, object details, colors, and style. 
    White background preferred.`;

    const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await currentAi.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    // Extract the image from the response
    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
    }

    throw new Error("No image data returned from model.");

  } catch (error) {
    console.error(`Error generating ${angleName}:`, error);
    throw error;
  }
};

/**
 * Upscales and enhances the resolution of an existing image.
 */
export const upscaleImage = async (
  base64Image: string,
  mimeType: string
): Promise<string> => {
  try {
    const cleanBase64 = base64Image.includes('base64,') 
      ? base64Image.split('base64,')[1] 
      : base64Image;

    const prompt = `Upscale this image. Enhance resolution, sharpen details, and improve clarity while maintaining the exact original composition, colors, and subject identity. Photorealistic 4k quality output.`;

    const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await currentAi.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
    }

    throw new Error("No upscaled image data returned.");

  } catch (error) {
    console.error("Error upscaling image:", error);
    throw error;
  }
};

/**
 * Edits an image based on a text prompt using Gemini 2.5 Flash Image.
 */
export const editImage = async (
  base64Image: string,
  mimeType: string,
  promptText: string
): Promise<string> => {
  try {
    const cleanBase64 = base64Image.includes('base64,') 
      ? base64Image.split('base64,')[1] 
      : base64Image;

    const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await currentAi.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
    }

    throw new Error("No image data returned from edit generation.");
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};

/**
 * Analyzes an image using Gemini 3 Pro.
 */
export const analyzeImage = async (
  base64Image: string,
  mimeType: string,
  promptText: string
): Promise<string> => {
  try {
    const cleanBase64 = base64Image.includes('base64,') 
      ? base64Image.split('base64,')[1] 
      : base64Image;

    const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await currentAi.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { text: promptText },
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
        ],
      },
    });

    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw error;
  }
};

/**
 * Generates a video using Veo model (veo-3.1-fast-generate-preview).
 * Supports both Text-to-Video and Image-to-Video.
 * Includes retry logic for API Key selection.
 */
export const generateVideo = async (
  prompt: string,
  aspectRatio: string,
  base64Image?: string,
  mimeType?: string,
  retryCount = 0
): Promise<string> => {
  // API Key check for Veo - initial check
  const win = window as any;
  if (retryCount === 0 && win.aistudio) {
    const hasKey = await win.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await win.aistudio.openSelectKey();
    }
  }

  // Create new instance to ensure fresh key usage
  const freshAi = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let operation;
  
  // Ensure Veo supported aspect ratios
  const validRatio = (aspectRatio === '16:9' || aspectRatio === '9:16') ? aspectRatio : '16:9';

  const config = {
    numberOfVideos: 1,
    resolution: '720p',
    aspectRatio: validRatio as any,
  };

  try {
    if (base64Image && mimeType) {
      const cleanBase64 = base64Image.includes('base64,') 
        ? base64Image.split('base64,')[1] 
        : base64Image;

      operation = await freshAi.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || undefined,
        image: {
          imageBytes: cleanBase64,
          mimeType: mimeType,
        },
        config: config as any
      });
    } else {
        if (!prompt) throw new Error("Prompt is required for text-to-video");
        operation = await freshAi.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            config: config as any
        });
    }

    // Polling
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await freshAi.operations.getVideosOperation({ operation: operation });
    }

    if (operation.error) {
        throw new Error(operation.error.message || "Video generation failed");
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("No video URI returned");

    // Fetch with key
    const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    if (!response.ok) throw new Error("Failed to download video content");

    const blob = await response.blob();
    return URL.createObjectURL(blob);

  } catch (error: any) {
    console.error("Video generation failed:", error);
    
    const errorMessage = error.message || JSON.stringify(error);
    
    // Check for specific error requiring key re-selection (404 or Not Found)
    if ((errorMessage.includes("Requested entity was not found") || errorMessage.includes("404")) && win.aistudio) {
         if (retryCount < 1) {
             console.log("Retrying video generation with key selection...");
             await win.aistudio.openSelectKey();
             // Retry once
             return generateVideo(prompt, aspectRatio, base64Image, mimeType, retryCount + 1);
         } else {
             throw new Error("The selected API Key cannot access the Veo model. Please ensure your project is enabled for Veo or try a different key.");
         }
    }
    throw error;
  }
};

// Chat Session Storage
let chatSession: any = null;

/**
 * Resets the current chat session.
 */
export const resetChatSession = () => {
  chatSession = null;
};

/**
 * Sends a message to the chat session and returns the response.
 * Uses gemini-3-pro-preview.
 */
export const sendChatMessage = async (message: string): Promise<string> => {
  if (!chatSession) {
    // Create fresh instance for chat initialization
    const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    chatSession = currentAi.chats.create({
      model: 'gemini-3-pro-preview',
       config: {
        systemInstruction: "You are a friendly and helpful AI assistant for the 30DayNanoBanana Multi-View Generator app. You can help users with questions about image generation, photography angles, or general inquiries.",
      },
    });
  }
  try {
    const response = await chatSession.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Chat error:", error);
    throw error;
  }
};

// --- Live API Implementation ---

let activeInputContext: AudioContext | null = null;
let activeOutputContext: AudioContext | null = null;
let activeMediaStream: MediaStream | null = null;
let activeSession: any = null; 
let sessionPromise: Promise<any> | null = null;
const activeSources = new Set<AudioBufferSourceNode>();
let nextStartTime = 0;

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export const stopLiveSession = () => {
    if (activeSession) {
        // The close method might not be available on the resolved session object in some SDK versions,
        // but best practice is to clean up resources.
        // The 'close' method isn't explicitly on the resolved session interface in all types,
        // but we handle cleanup via closing contexts.
        activeSession = null;
    }
    sessionPromise = null;

    if (activeInputContext) {
        activeInputContext.close();
        activeInputContext = null;
    }
    if (activeOutputContext) {
        activeOutputContext.close();
        activeOutputContext = null;
    }
    if (activeMediaStream) {
        activeMediaStream.getTracks().forEach(t => t.stop());
        activeMediaStream = null;
    }
    activeSources.forEach(s => {
        try { s.stop(); } catch(e) {}
    });
    activeSources.clear();
    nextStartTime = 0;
};

export const startLiveSession = async (onStatus: (status: string) => void) => {
    stopLiveSession(); // Ensure clean start
    
    onStatus('connecting');
    
    try {
        // Check/Select API Key
        const win = window as any;
        if (win.aistudio) {
             const hasKey = await win.aistudio.hasSelectedApiKey();
             if (!hasKey) {
                 await win.aistudio.openSelectKey();
             }
        }

        // Create fresh instance with current key
        const liveAi = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // Setup Audio
        activeInputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        activeOutputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const outputNode = activeOutputContext.createGain();
        outputNode.connect(activeOutputContext.destination);

        activeMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Connect to Gemini
        sessionPromise = liveAi.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
                },
                systemInstruction: 'You are a helpful AI assistant. Respond concisely and naturally.',
            },
            callbacks: {
                onopen: () => {
                    onStatus('connected');
                    // Start input streaming
                    if (!activeInputContext || !activeMediaStream) return;
                    
                    const source = activeInputContext.createMediaStreamSource(activeMediaStream);
                    const scriptProcessor = activeInputContext.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        if (sessionPromise) {
                            sessionPromise.then(session => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        }
                    };
                    
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(activeInputContext.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64Audio && activeOutputContext) {
                        nextStartTime = Math.max(nextStartTime, activeOutputContext.currentTime);
                        
                        const audioBuffer = await decodeAudioData(
                            decode(base64Audio),
                            activeOutputContext,
                            24000,
                            1
                        );
                        
                        const source = activeOutputContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputNode);
                        source.addEventListener('ended', () => {
                            activeSources.delete(source);
                        });
                        source.start(nextStartTime);
                        nextStartTime += audioBuffer.duration;
                        activeSources.add(source);
                    }
                    
                     if (message.serverContent?.interrupted) {
                        activeSources.forEach(s => {
                             try { s.stop(); } catch(e) {}
                        });
                        activeSources.clear();
                        nextStartTime = 0;
                     }
                },
                onclose: () => {
                    onStatus('disconnected');
                },
                onerror: (err) => {
                    console.error("Live API Error:", err);
                    onStatus('error');
                }
            }
        });
        
        activeSession = await sessionPromise;

    } catch (error) {
        console.error("Failed to start live session:", error);
        onStatus('error');
        stopLiveSession();
    }
};
