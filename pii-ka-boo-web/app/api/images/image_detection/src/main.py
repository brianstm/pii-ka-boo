import argparse
import os
import cv2
from pathlib import Path
import sys
import io

# Set the default encoding to utf-8 to handle non-ASCII characters
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Add the parent directory to sys.path to import the custom module
parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(parent_dir)
from text_redactor.pii_blur.pipeline import PipelineConfig, PIIBlurPipeline

def iter_images(path: Path):
    if path.is_file():
        yield path
    else:
        for root, _, files in os.walk(path):
            for filename in files:
                filepath = Path(root) / filename
                if filepath.suffix.lower() in {".jpg", ".jpeg", ".png"}:
                    yield filepath

def clean_path(path: str) -> str:
    try:
        # Try encoding and decoding in utf-8 to catch issues with characters
        path.encode('utf-8').decode('utf-8')
        return path
    except UnicodeDecodeError:
        raise ValueError(f"Path contains characters that cannot be decoded: {path}")

def main():
    parser = argparse.ArgumentParser(description="Automatic PII and GeoLocation blurring for images.")
    parser.add_argument("--input", required=True, help="Path to an image file or a folder of images.")
    parser.add_argument("--output", required=True, help="Output folder for redacted images.")
    parser.add_argument("--config", default="config.json", help="Path to JSON config.")
    args = parser.parse_args()

    in_path = clean_path(str(args.input))
    out_dir = clean_path(str(args.output))
    out_dir_path = Path(out_dir)
    out_dir_path.mkdir(parents=True, exist_ok=True)

    cfg = PipelineConfig.from_json(args.config)
    pipe = PIIBlurPipeline(cfg)
    print(f"Processing images from {in_path} to {out_dir} using config {args.config}")
    
    for img_path in iter_images(Path(in_path)):
        try:
            result = pipe.process_image(str(img_path))
            out_path = out_dir_path / img_path.name
            cv2.imwrite(str(out_path), result["image"])
            print(f"Saved redacted image -> {out_path} (PII tags: {result['num_pii_tags']})")
        except Exception as e:
            print(f"Failed on {img_path}: {e}")

if __name__ == "__main__":
    main()
    # After processing is done, print "Success" to indicate completion
    print("Success")
