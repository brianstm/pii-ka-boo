from faster_whisper import WhisperModel
import sys
import json
# pip install faster-whisper ffmpeg-python

if __name__ == "__main__":
    AUDIO_FILE = sys.argv[1]
    model = WhisperModel(
        "small",                 # was "medium"
        device="cpu",
        compute_type="int8",
        cpu_threads=8,           # set to your physical core count
        num_workers=1            # increase if you batch many files
    )
    
    segments, _ = model.transcribe(
        AUDIO_FILE,
        beam_size=1,             # greedy
        language="en",           # skip language detection
        vad_filter=False,        # turn ON only for messy audio
        condition_on_previous_text=False  # small extra speed-up
    )

    # Join all segment texts into one string
    result = "".join([seg.text for seg in segments])

    # Print result as JSON
    print(json.dumps({"response": result}, ensure_ascii=False))
