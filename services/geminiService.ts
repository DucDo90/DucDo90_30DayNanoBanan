import { GoogleGenAI, Modality } from "@google/genai";
import { ImageQuality } from "../types";

// Initialize the client with the API key from the environment
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
    const response = await ai.models.generateImages({
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
    // Clean base64 string if it includes the data prefix
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

    const response = await ai.models.generateContent({
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

    const response = await ai.models.generateContent({
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

    const response = await ai.models.generateContent({
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

    const response = await ai.models.generateContent({
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
