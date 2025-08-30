export interface PatternComponent {
  type:
    | "literal"
    | "letters"
    | "uppercase_letters"
    | "lowercase_letters"
    | "digits"
    | "any_char"
    | "whitespace"
    | "non_whitespace"
    | "word_char"
    | "non_word_char";
  value?: string;
  quantity?: number | string | [number, number];
}

export interface PatternMatchRequest {
  text: string;
  pattern_sequence: PatternComponent[];
  replace_by?: string;
}

export interface PatternMatchResponse {
  success: boolean;
  original: string;
  processed: string;
  pattern_sequence: PatternComponent[];
  error?: string;
}

class PatternService {
  async matchPattern(
    request: PatternMatchRequest
  ): Promise<PatternMatchResponse> {
    try {
      const response = await fetch("/api/pattern", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Pattern matching failed");
      }

      return await response.json();
    } catch (error) {
      console.error("Pattern matching error:", error);
      throw error;
    }
  }

  createLiteralComponent(
    value: string,
    quantity: number | string | [number, number] = 1
  ): PatternComponent {
    return {
      type: "literal",
      value,
      quantity,
    };
  }

  createLettersComponent(
    quantity: number | string | [number, number] = 1
  ): PatternComponent {
    return {
      type: "letters",
      quantity,
    };
  }

  createDigitsComponent(
    quantity: number | string | [number, number] = 1
  ): PatternComponent {
    return {
      type: "digits",
      quantity,
    };
  }

  createAnyCharComponent(
    quantity: number | string | [number, number] = 1
  ): PatternComponent {
    return {
      type: "any_char",
      quantity,
    };
  }

  createWhitespaceComponent(
    quantity: number | string | [number, number] = 1
  ): PatternComponent {
    return {
      type: "whitespace",
      quantity,
    };
  }

  createWordCharComponent(
    quantity: number | string | [number, number] = 1
  ): PatternComponent {
    return {
      type: "word_char",
      quantity,
    };
  }
}

export const patternService = new PatternService();
