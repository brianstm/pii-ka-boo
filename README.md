# PII-KA-BOO

<img width="452" height="117" alt="PII-KA-BOO Logo" src="https://github.com/user-attachments/assets/0c2eb456-3092-4918-8ae7-74c91d8f70db" />

**The All-In-One On-Device PII Scrubber**

A powerful privacy-first solution that automatically detects and removes Personally Identifiable Information (PII) from text, images, and audio before sending content to AI services.

---

## 🌟 Inspiration

With the rise of AI assistants and cloud-based LLMs, people are increasingly sharing sensitive information online without realizing the risks. We wanted to build something that gives users peace of mind: a **powerful on-device privacy scrubber** that protects text, images, and even audio before it ever leaves their device. The idea was to empower individuals to benefit from AI while staying in control of their personal data.

## 🚀 What it does

**PII-KA-BOO** automatically detects and removes Personally Identifiable Information (PII) from text, images, and audio. Users can apply flexible, category-based filters (names, emails, phone numbers, addresses, URLs, etc.) to decide exactly what to redact. After scrubbing, the sanitized content can safely be sent to cloud AI services, while the original remains protected on-device. Response from the cloud AI services will then be displayed with the original content.

### Key Features:

- **📝 Text PII Redaction** - Advanced pattern matching and ML-based detection
- **🖼️ Image Anonymization** - Face blurring, license plate detection, and text redaction
- **🎤 Audio Scrubbing** - Remove spoken names and other PII from voice recordings
- **⚙️ Category-based Filters** - Full user control over what gets redacted
- **🔄 Context Preservation** - Smart placeholders for seamless AI processing
- **🔒 On-Device Processing** - Your data never leaves your device unprocessed

## 🏗️ Architecture & Technologies

### **Cross-Platform Applications**

#### **Web Application (`pii-ka-boo-web/`)**

- **Framework**: Next.js 14 with TypeScript
- **UI**: Tailwind CSS components
- **State Management**: React hooks with localStorage persistence

#### **Mobile Application (`pii-ka-boo-lynx/`)**

- **Framework**: Lynx Framework
- **Platform**: Cross-platform (iOS & Android)
- **UI**: Native components with custom styling

### **Backend Services (`backend/`)**

#### **Text Processing Pipeline**

- **Detection**: Multi-stage PII processing with regex and ML models
- **Models**: DistilBERT for named entity recognition
- **Placeholders**: Structured replacement (`[NAME_1]`, `[EMAIL_2]`, etc.)
- **Restoration**: Local mapping back to original values

#### **Image Processing (`backend/image_detection/`)**

- **Face Detection**: YOLO-based models for face and object detection
- **Text OCR**: EasyOCR for extracting text from images
- **Blurring**: Gaussian and mosaic blurring techniques
- **Location Redaction**: Geo-location detection and redaction

#### **Audio Processing (`backend/transcribe-audio/`)**

- **Transcription**: Whisper-based speech-to-text
- **PII Detection**: Audio-specific pattern matching
- **Redaction**: Audio segment removal and replacement

## 🛠️ How we built it

We built the mobile app using the **Lynx framework** for the mobile layout as well as a web app using **Next.js**. For text redaction, we designed a **multi-stage PII processing pipeline**:

1. **Detection**: PII detection using regex and lightweight ML models like DistilBERT, choosing the best approach based on the use case
2. **Replacement**: Replace with structured placeholders (`[NAME_1]`, `[EMAIL_2]`, etc.)
3. **AI Integration**: Send sanitized content to Gemini AI
4. **Restoration**: Restore context by mapping placeholders back to original values (locally)

Image and audio scrubbing use on-device ML models for face/voice detection to ensure consistency across modalities.

### **Technology Stack**

| Component      | Technology              | Purpose                   |
| -------------- | ----------------------- | ------------------------- |
| **Frontend**   | Next.js 14 + TypeScript | Web application           |
| **Mobile**     | Lynx Framework          | Cross-platform mobile app |
| **Text ML**    | DistilBERT,             | PII detection             |
| **Image ML**   | YOLO, EasyOCR, Presidio | PII Image detection       |
| **Audio ML**   | Whisper                 | Speech transcription      |
| **AI Service** | Gemini 2.5 Flash        | Cloud AI processing       |
| **Styling**    | Tailwind CSS            | Modern UI components      |

## 🎯 Key Features Explained

### **Text Processing**

- **Multi-model Detection**: Combines regex patterns with ML models for accuracy
- **Custom Patterns**: User-defined patterns for specific use cases
- **Category Filtering**: Granular control over what types of PII to redact
- **Context Preservation**: Smart placeholder system maintains AI processing quality

### **Image Processing**

- **Face Detection**: Automatic detection and blurring of faces
- **Text OCR**: Extracts and redacts text from images
- **Object Detection**: Identifies sensitive objects (license plates, etc.)
- **Location Redaction**: Removes GPS and location metadata

### **Audio Processing**

- **Speech Recognition**: Converts audio to text for PII detection
- **Segment Redaction**: Precisely removes sensitive information

## 🚧 Challenges we ran into

- **Offline Processing**: Designing a system that works **completely offline** without sending raw PII to servers
- **Accuracy vs. Over-redaction**: Balancing detection accuracy (e.g., distinguishing "May" the name from "May" the month)
- **Multi-modal Integration**: Integrating multiple data types (text, image, audio) into a single, seamless pipeline
- **Performance Optimization**: Running ML models on-device while maintaining real-time performance
- **Cross-platform Consistency**: Ensuring the same privacy guarantees across web and mobile platforms

## 🏆 Accomplishments that we're proud of

- Built a **cross-platform mobile and web app** that actually works in real time on-device
- Extended beyond text to **image and audio redaction**, making it more comprehensive than existing tools
- Created a **category-based filter system**, giving users full transparency and control over their data
- Successfully integrated with Gemini AI while ensuring no raw PII ever leaves the device
- Achieved **sub-second processing** for most text and image operations
- Implemented **granular privacy controls** that users can customize per use case

## 📚 What we learned

- **Privacy-first Design**: Privacy-first design requires **rethinking data flow**, you can't just "add security later"
- **User Control**: Users want **granularity and transparency** in privacy tools, not a one-size-fits-all approach
- **On-device ML**: Running ML models on-device is challenging but crucial for trust
- **UX Matters**: Even the strongest privacy tool fails if users find it confusing or intrusive
- **Performance Trade-offs**: Balancing privacy, accuracy, and performance requires careful optimization
- **Cross-platform Development**: Maintaining feature parity across platforms while respecting platform-specific constraints

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.8+ (for ML models)
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/brianstm/pii-ka-boo
   cd pii-ka-boo
   ```

2. **Web Application**

   ```bash
   cd pii-ka-boo-web
   npm install
   npm run setup:py
   npm run dev
   ```

3. **Mobile Application**

   ```bash
   cd pii-ka-boo-lynx
   npm install
   npm run dev
   ```

### Environment Variables

Create `.env` files in the respective directories:

```env
# Web App
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_GEMINI_API_KEY=your_gemini_api_key
```

## 📱 Usage

1. **Upload Content**: Drag and drop or select text, images, or audio files
2. **Configure Filters**: Choose which PII categories to redact
3. **Process**: Let PII-KA-BOO automatically detect and redact sensitive information
4. **Send to AI**: Safely send sanitized content to Gemini AI
5. **View Results**: See AI responses with original context restored

**Built with ❤️ for privacy and security**
