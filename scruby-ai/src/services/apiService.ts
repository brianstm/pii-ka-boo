export interface PiiAnalysis {
  hasPII: boolean;
  scrubbedText: string;
}

export function analyzePII(text: string): PiiAnalysis {
  return {
    hasPII: false,
    scrubbedText: text,
  };
}
