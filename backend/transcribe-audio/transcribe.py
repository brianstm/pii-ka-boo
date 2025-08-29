from faster_whisper import WhisperModel
#pip install faster-whisper ffmpeg-python

AUDIO_FILE = "sample_input_3.m4a"

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

with open("transcript.txt", "w", encoding="utf-8") as f:
    for seg in segments:
        f.write(seg.text)
print("transcript.txt saved!")
