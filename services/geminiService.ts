
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { DailyItinerary, Activity, GroundingChunk } from '../types';

/**
 * Parses the Markdown text response from Gemini into a structured DailyItinerary array.
 * This function assumes a specific Markdown format from the model for reliable parsing.
 * @param markdownText The Markdown string received from the Gemini API.
 * @returns An array of DailyItinerary objects.
 */
const parseMarkdownItinerary = (markdownText: string): DailyItinerary[] => {
  const itinerary: DailyItinerary[] = [];
  const lines = markdownText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  let currentDay: DailyItinerary | null = null;
  let currentActivity: Activity | null = null;

  for (const line of lines) {
    // Match Day heading: "## Day X: YYYY-MM-DD" or "## Day X: [Date]"
    const dayMatch = line.match(/^## Day (\d+): (.+)$/);
    if (dayMatch) {
      if (currentDay) {
        itinerary.push(currentDay);
      }
      currentDay = {
        day: parseInt(dayMatch[1], 10),
        date: dayMatch[2].trim(),
        activities: [],
      };
      continue;
    }

    if (!currentDay) continue; // Skip if no day heading found yet

    // Match Activity name: "- **[Time] Activity Name**" or "- **Activity Name**"
    const activityMatch = line.match(/^- \*\*([^\*]+)\*\*(?::\s*(.*))?$/);
    if (activityMatch) {
      if (currentActivity) {
        currentDay.activities.push(currentActivity);
      }
      // Fix: Initialize actualCost to null to satisfy the Activity interface
      currentActivity = {
        name: activityMatch[1].trim(),
        description: '', // Will be filled by subsequent lines
        openingHours: 'N/A',
        estimatedCost: 'N/A',
        actualCost: null, // Initialize actualCost as required by the Activity interface
      };
      continue;
    }

    if (!currentActivity) continue; // Skip if no activity heading found yet

    // Match Description: "- Description" (if any, as part of activity block)
    const descriptionMatch = line.match(/^- (.+)$/);
    if (descriptionMatch && currentActivity.description === '') {
      currentActivity.description = descriptionMatch[1].trim();
      continue;
    }


    // Match Opening/Closing Hours: "- Jam Buka/Tutup: HH:MM - HH:MM"
    const hoursMatch = line.match(/^- Jam Buka\/Tutup: (.+)$/);
    if (hoursMatch) {
      currentActivity.openingHours = hoursMatch[1].trim();
      continue;
    }

    // Match Estimated Cost: "- Estimasi Biaya: [Currency] [Amount]"
    const costMatch = line.match(/^- Estimasi Biaya: (.+)$/);
    if (costMatch) {
      currentActivity.estimatedCost = costMatch[1].trim();
      continue;
    }

    // Match Check Price Link (placeholder)
    const linkMatch = line.match(/^- Link Cek Harga: (.+)$/);
    if (linkMatch) {
      // For now, we'll just store the text, client-side will render as button
      currentActivity.checkPriceLink = linkMatch[1].trim();
      continue;
    }
  }

  // Push the last activity and day if they exist
  if (currentActivity && currentDay) {
    currentDay.activities.push(currentActivity);
  }
  if (currentDay) {
    itinerary.push(currentDay);
  }

  return itinerary;
};


export const generateTravelItinerary = async (
  destination: string,
  duration: number,
  interests: string,
): Promise<{ itinerary: DailyItinerary[], urls: GroundingChunk[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-flash';

  const prompt = `
  Anda adalah perencana perjalanan AI yang profesional, membantu, dan kreatif.
  Buat rencana perjalanan harian yang terperinci untuk perjalanan ke ${destination} selama ${duration} hari.
  Pertimbangkan minat saya: ${interests}.
  Gunakan informasi terkini dan nyata untuk menyarankan aktivitas, tempat wisata, dan perkiraan biaya.
  Sertakan jam buka/tutup, perkiraan biaya dalam mata uang lokal (misalnya IDR 50.000), dan "Link Cek Harga: [Nama Produk/Layanan]" sebagai placeholder untuk tombol.
  
  Format respons Anda secara *ketat* dalam Markdown berikut:

  # Rencana Perjalanan untuk ${destination}

  ## Day 1: [YYYY-MM-DD atau Deskripsi Hari]
  - **[Waktu atau Urutan] [Nama Tempat/Aktivitas]**
    - [Deskripsi Singkat Aktivitas/Tempat]
    - Jam Buka/Tutup: [Jam Buka - Jam Tutup, e.g., 09:00 - 17:00]
    - Estimasi Biaya: [Mata Uang Lokal + Jumlah, e.g., IDR 50.000]
    - Link Cek Harga: [Nama Tiket/Pemesanan]

  ## Day 2: [YYYY-MM-DD atau Deskripsi Hari]
  - **[Waktu atau Urutan] [Nama Tempat/Aktivitas]**
    - [Deskripsi Singkat Aktivitas/Tempat]
    - Jam Buka/Tutup: [Jam Buka - Jam Tutup]
    - Estimasi Biaya: [Mata Uang Lokal + Jumlah]
    - Link Cek Harga: [Nama Tiket/Pemesanan]

  ...dan seterusnya untuk semua ${duration} hari.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const markdownText = response.text || '';
    const itinerary = parseMarkdownItinerary(markdownText);
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { itinerary, urls: groundingChunks as GroundingChunk[] };

  } catch (error) {
    console.error("Error generating itinerary:", error);
    throw new Error(`Failed to generate itinerary: ${error instanceof Error ? error.message : String(error)}`);
  }
};