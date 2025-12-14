
export interface Activity {
  name: string;
  description: string;
  openingHours: string;
  estimatedCost: string;
  checkPriceLink?: string; // Optional, might not be directly from AI
  actualCost: number | null; // New field for user-input actual cost
}

export interface DailyItinerary {
  day: number;
  date: string;
  activities: Activity[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
      reviewSnippets?: Array<{
        uri: string;
        title: string;
      }>;
    };
  };
}
