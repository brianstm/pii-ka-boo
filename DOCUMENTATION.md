# PII-KA-BOO: The All-In-One On-Device PII Scrubber

<img width="452" height="117" alt="image" src="https://github.com/user-attachments/assets/0c2eb456-3092-4918-8ae7-74c91d8f70db" />

# Installation

This guide will walk you through setting up the project and installing all necessary dependencies.

## Prerequisites

Before starting, make sure you have the following tools installed:

- _Node.js_ (version 16.x or later)
- _Python_ (version 3.6 or later)
- _pip_ (Python package manager)

## Python Dependencies

From the files, the following Python packages need to be installed for each respective environment:

### Audio Environment:

- faster-whisper
- ffmpeg-python

### Image Environment:

- transformers==4.52.2
- torch==2.7.0
- opencv-python==4.12.0.88
- easyocr==1.7.2
- presidio-analyzer==2.2.359

### Text Environment:

- torch==2.3.1
- transformers>=4.38
- tokenizers>=0.15.2
- huggingface-hub>=0.23
- safetensors>=0.4.2

## Installation Steps

### Automatic

```bash
npm run setup:py
```

or

### Manual

1. Set up Node.js Environment

   ```bash
   npm install
   ```

2. Configure the Project

   If you need to make any changes to configuration files (like API keys or environment variables), ensure to add them in the respective .env file or configuration file as instructed by the project.

3. Run the Setup Scripts
   There are setup scripts provided for different sections of the project:
   - To set up the audio environment, run:
     ````bash
     node ./setup/setup-audio-python.js```
     ````
   - To set up the image environment, run:
     ````bash
     node ./setup/setup-image-python.js```
     ````
   - To set up the text environment, run:
     ````bash
     node ./setup/setup-text-python.js```
     ````
4. Running the Project
   ```bash
   npm run dev
   ```

# How to Use

1. Input Your Data or Prompt

- Use the main rectangle input box to enter your text prompt.
- To add images, click the plus (+) button on the left side of the input box.
- To add audio, use the mic button on the right side of the input box.

2. Customize PII Filtering

- Click the **PII Filter** button at the top right, nect to the settings icon.
- Uncheck any categories you want to exclude from scrubbing.
  - The first two section (I\*- and PERSON) is for images.
  - The last section (SHORT TAGS) is for text and audio.
- To add custom pattern, click the Add Custom Pattern button and fill in the pattern components

3. View the Output:
   There is 3 output sections designed for transparency:

- Input After Scrubbing: Shows your original input with PII masked.
- Gemini Output: Display the response from LLMs (Gemini) based on the scrubbed input.
- Gemini Output with Restored PII: Presents ythe LLM response with any previously scrubbed information reinserted, if it appears in the output.

# Technical Documentation

## Text Scrubbing

Stored in pii-ka-boo-web/app/api/text/model_2.ipynb

### Model Details

- Model Name: The script uses a fine-tuned version of distilbert-base-cased, a state-of-the-art language model from the Hugging Face transformers library.
- Training: The model was trained or fine-tuned on a custom dataset for PII detection, which is pii_dataset.csv.
- Functionality: The model performs a Named Entity Recognition (NER) task to classify spans of text as specific PII categories (e.g., NAME, EMAIL, etc).

### How It Works

The main function redact takes an input text and processes it in the following steps:

- Tokenization: The text is converted into a format the model can understand.
- PII Detection: The model predicts the PII type for each token.
- Redaction: The script replaces the detected PII spans with a standardized placeholder format, such as [NAME]

## Audio Scrubbing

- Audio Transcription: uses the faster-whisper library and the "small" Whisper model to convert an audio file to text. Call the model.transcribe() function with the audio file path as an argument.
- PII Redaction: Tuses a fine-tuned distilbert-base-cased model from the Hugging Face transformers library. The main function to call is redact(text, target_labels), where text is the transcript and target_labels is an optional list of PII types you want to remove.

## Image Scrubbing

### Location Image

- Detection: It uses two methods to identify sensitive areas in an image:
  - Geographical Location: use StreetCLIPGradCAM model to determine an image's location. It generates a "heatmap" using Grad-CAM or Eigen-CAM to highlight the parts of the image that influence the location prediction.
- Redaction: After detection, the pipeline uses the generated heatmap to create a mask. This mask is then applied to the image to blur the sensitive areas. The script can apply either a Gaussian blur (a smooth blur) or a Mosaic blur (a pixelated effect), depending on the configuration.

### Text Image
- Optical Character Recognition (OCR): The pipeline first uses an OCR engine to extract text and its location from an image. The script uses the EasyOCR library, a fast and highly accurate OCR tool. The EasyOCREngine class is responsible for this task, calling the reader.readtext() function to get the text and its bounding box coordinates.
- ⁠PII Detection: Once the text is extracted, the script uses two different PII detection models to identify sensitive information. This dual-model approach likely increases the accuracy and robustness of the pipeline. The two detectors used are:
    - PresidioDetector: This component uses the Microsoft Presidio library and a spaCy model (en_core_web_lg) to detect PII. The PresidioDetector class calls the analyzer.analyze() method on the extracted text to identify PII entities.
    - PiiranhaDetector: This component uses a PII detection model from the Hugging Face transformers library. The script is configured to use the iiiorg/piiranha-v1-detect-personal-information model. The PiiranhaDetector class uses the pipeline function for token-classification to detect PII.
- ⁠Redaction: After the PII is identified, the pipeline uses the bounding box information to create a mask over the sensitive areas. The script then applies a blur to these areas, using either a Gaussian blur (a smooth blur) or a Mosaic blur (a pixelated effect) to obscure the information.

