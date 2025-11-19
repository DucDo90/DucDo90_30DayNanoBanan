
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
