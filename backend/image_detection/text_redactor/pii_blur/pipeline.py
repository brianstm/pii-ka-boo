from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict, Any, Tuple
import os
import json
import cv2
import numpy as np

from backend.image_detection.core.types import BBox, PIIType, Mask
from backend.image_detection.text_redactor.ocr.easyocr_engine import EasyOCREngine
from backend.image_detection.text_redactor.detector.presidio_detector import PresidioDetector
from backend.image_detection.text_redactor.detector.piiranha_detector import PiiranhaDetector
from .apply_blur import apply_gaussian_blur, apply_mosaic_blur

@dataclass
class PipelineConfig:
    ocr_engine: str = "easyocr"
    ocr_langs: List[str] = None
    ocr_detail: int = 1
    pii_engine: str = "piiranha"
    language: str = "en"
    model_name: str = "iiiorg/piiranha-v1-detect-personal-information"
    target_entities: List[str] = None
    min_pii_score: float = 0.35
    min_ocr_confidence: float = 0.3
    blur_method: str = "gaussian"   # gaussian | mosaic
    blur_strength: int = 31
    
    @classmethod
    def from_json(cls, path: str) -> "PipelineConfig":
        with open(path, "r") as f:
            cfg = json.load(f)
            pii_params = cfg["pii"]
        return cls(
            ocr_engine=cfg.get("ocr", {}).get("engine", "easyocr"),
            ocr_langs=cfg.get("ocr", {}).get("langs", ["en"]),
            ocr_detail=int(cfg.get("ocr", {}).get("detail", 1)),

            presidio_language = pii_params.get("language", "en"),
            presidio_target_entities = pii_params.get("target_entities", []),
            presidio_min_score = float(pii_params.get("min_score", 0.5)),

            piiranha_model_name = pii_params.get("model_name", "iiiorg/piiranha-v1-detect-personal-information"),
            piiranha_target_entities = pii_params.get("target_entities", []),
            piiranha_min_score = float(pii_params.get("min_score", 0.5)),

            min_ocr_confidence=float(cfg.get("min_ocr_confidence", 0.3)),
            blur_method=cfg.get("blur", {}).get("method", "gaussian"),
            blur_strength=int(cfg.get("blur", {}).get("strength", 31)),
        )

class PIIBlurPipeline:
    def __init__(self, config: PipelineConfig):
        self.cfg = config
        self.ocr = EasyOCREngine(langs=self.cfg.ocr_langs, detail=self.cfg.ocr_detail)

        if self.cfg.pii_engine == "presidio":
            self.detector = PresidioDetector(language=self.cfg.language, target_entities=self.cfg.target_entities, min_confidence_score=self.cfg.min_pii_score)
        else:
            self.detector = PiiranhaDetector(self.cfg.model_name, target_entities=self.cfg.target_entities, min_confidence_score=self.cfg.min_pii_score)

    def _mask_from_BBox(self, box: BBox, width: int, height: int) -> Mask:
        mask = Mask.from_polygon(box.bbox)
        return mask.clip(width, height)

    def _apply_blur(self, image: np.ndarray, mask: Mask) -> None:
        if self.cfg.blur_method == "gaussian":
            apply_gaussian_blur(image, mask, ksize=self.cfg.blur_strength)
        else:
            apply_mosaic_blur(image, mask, block_size=self.cfg.blur_strength)

    def process_image(self, image_path: str) -> Dict[str, Any]:
        img = cv2.imread(image_path)
        if img is None:
            raise FileNotFoundError(f"Could not read image: {image_path}")
        h, w = img.shape[:2]

        ocr_boxes: List[BBox] = self.ocr.extract(image_path)
        ocr_boxes = [b for b in ocr_boxes if b.confidence is None or b.confidence >= self.cfg.min_ocr_confidence]

        pii_tags: List[PIIType] = self.detector.detect(ocr_boxes)

        for tag in pii_tags:
            mask = self._mask_from_BBox(ocr_boxes[tag.box_index], w, h)
            self._apply_blur(img, mask)

        return {
            "path": image_path,
            "image": img,
            "num_ocr_boxes": len(ocr_boxes),
            "num_pii_tags": len(pii_tags),
            "pii_tags": pii_tags,
        }
