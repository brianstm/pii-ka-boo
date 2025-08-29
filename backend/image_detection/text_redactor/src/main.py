import argparse
import os
import cv2
from pathlib import Path

from backend.image_detection.text_redactor.pii_blur.pipeline import PipelineConfig, PIIBlurPipeline

def iter_images(path: Path):
    if path.is_file():
        yield path
    else:
        for root, _, files in os.walk(path):
            for filename in files:
                filepath = Path(root) / filename
                if filepath.suffix.lower() in {".jpg",".jpeg",".png"}:
                    yield filepath

def main():
    parser = argparse.ArgumentParser(description="Automatic PII blurring for images (OCR + Presidio).")
    parser.add_argument("--input", required=True, help="Path to an image file or a folder of images.")
    parser.add_argument("--output", required=True, help="Output folder for redacted images.")
    parser.add_argument("--config", default="config.yaml", help="Path to YAML config.")
    args = parser.parse_args()

    in_path = Path(args.input)
    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    cfg = PipelineConfig.from_json(args.config)
    pipe = PIIBlurPipeline(cfg)

    for img_path in iter_images(in_path):
        try:
            result = pipe.process_image(str(img_path))
            out_path = out_dir / img_path.name
            cv2.imwrite(str(out_path), result["image"])
            print(f"Saved redacted image -> {out_path} (PII tags: {result['num_pii_tags']})")
        except Exception as e:
            print(f"Failed on {img_path}: {e}")

if __name__ == "__main__":
    main()