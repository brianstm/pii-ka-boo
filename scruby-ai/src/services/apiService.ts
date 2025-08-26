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

export async function sendMessage(
  text: string,
  imageFile?: File,
  audioBlob?: Blob,
): Promise<string> {
  console.log('sendMessage called with:');
  console.log('- Text:', text);
  if (imageFile) {
    console.log('- Image file:', imageFile.name);
  }
  if (audioBlob) {
    console.log('- Audio blob:', audioBlob.size, 'bytes');
  }

  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1500));

  let response = 'AI Response: ';
  if (imageFile) {
    response += `I can see the image "${imageFile.name}". `;
  }
  if (audioBlob) {
    response += 'I heard your audio message. ';
  }
  response += `Regarding your text: "${text}"`;

  return response;
}
