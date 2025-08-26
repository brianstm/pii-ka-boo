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

export async function uploadImage(imageFile: File): Promise<string> {
  console.log(
    'uploadImage called with:',
    imageFile.name,
    imageFile.type,
    imageFile.size,
  );
  console.log('This image is being used:', imageFile.name);

  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return `Image ${imageFile.name} processed successfully`;
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  console.log(
    'transcribeAudio called with audio blob:',
    audioBlob.size,
    'bytes',
  );
  console.log('Audio transcription in progress...');

  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return 'This is a mock transcription of the audio recording';
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
