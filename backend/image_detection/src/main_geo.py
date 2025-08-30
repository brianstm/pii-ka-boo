import argparse, os, cv2
from pathlib import Path
from backend.image_detection.location_redactor.pipeline import GeoCamConfig, GeoCamPipeline

def iter_images(path: Path):
    if path.is_file(): yield path
    else:
        for root, _, files in os.walk(path):
            for f in files:
                p = Path(root)/f
                if p.suffix.lower() in {'.jpg','.jpeg','.png','.bmp','.tiff','.webp'}:
                    yield p

def main():
    ap = argparse.ArgumentParser(description='GeoGuessr CAM-based location-clue blurring (StreetCLIP).')
    ap.add_argument('--input', required=True)
    ap.add_argument('--output', required=True)
    ap.add_argument('--config', default='backend/image_detection/config.geo.yaml')
    args = ap.parse_args()

    out_dir = Path(args.output); out_dir.mkdir(parents=True, exist_ok=True)
    cfg = GeoCamConfig.from_json(args.config)
    pipe = GeoCamPipeline(cfg)

    for img_path in iter_images(Path(args.input)):
        try:
            res = pipe.process_image(str(img_path))
            cv2.imwrite(str(out_dir / img_path.name), res['image'])
            print(f"[OK] {img_path.name}: {res['top_labels']} regions={res['num_regions']} coverage={res['mask_coverage']:.2%}")
        except Exception as e:
            print(f"[FAIL] {img_path}: {e}")

if __name__ == '__main__':
    main()
