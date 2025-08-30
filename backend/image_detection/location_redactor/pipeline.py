from __future__ import annotations
import os
import json
import pathlib
from dataclasses import dataclass, field
from typing import List, Dict, Any
import numpy as np
import cv2


from backend.image_detection.core.types import Mask
from backend.image_detection.core.apply_blur import apply_gaussian_blur, apply_mosaic_blur

from backend.image_detection.location_redactor.oclussion_cam import OcclusionCAM
from backend.image_detection.location_redactor.geo_gradcam import StreetCLIPGradCAM

@dataclass
class GeoCamConfig:
    labels: List[str] = field(default_factory=lambda: ["Singapore","Malaysia","Indonesia","Thailand","Philippines","Vietnam"])
    device: str = "cpu"
    topk: int = 1
    window: int = 64
    stride: int = 32
    fill: str = "blur"
    mask_top_p: float = 0.2
    dilate: int = 9
    blur_method: str = "mosaic"
    blur_strength: int = 75

    @classmethod
    def from_json(cls, path: str) -> "GeoCamConfig":
        with open(path, "r") as f:
            cfg = json.load(f)
            geocam_params = cfg["geo"]
        return cls(
            labels = geocam_params.get("labels", ["Singapore"]),
            device = geocam_params.get("device", "cpu"),
            topk = geocam_params.get("topk", 1),
            window = geocam_params.get("window", 64),
            stride = geocam_params.get("stride", 32),
            fill = geocam_params.get("fill", "blur"),
            dilate = geocam_params.get("dilate", 9),
            mask_top_p = geocam_params.get("mask_top_p", 0.2)
        )


class GeoCamPipeline:
    def __init__(self, config: GeoCamConfig):
        self.cfg = config
        self.clf = StreetCLIPGradCAM(self.cfg.labels, device = self.cfg.device)
        self.ocam = OcclusionCAM(window = self.cfg.window, stride = self.cfg.stride, fill = self.cfg.fill)

    def _heat_to_mask(self, heat: np.ndarray, top_p: float, dilate: int) -> np.ndarray:
        h = heat.copy().astype(np.float32)
        h = (h - h.min())/(h.max() - h.min() + 1e-9)
        thresh = np.quantile(h, 1.0 - top_p)
        mask = (h >= thresh).astype(np.uint8) * 255
        if dilate>1:
            k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(dilate,dilate))
            mask = cv2.dilate(mask, k, 1)
        return mask
    
    def _mask_to_rects(self, mask: np.ndarray):
        contours,_ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        return [cv2.boundingRect(c) for c in contours]
    
    def process_image(self, image_path: str) -> Dict[str, Any]:
        img = cv2.imread(image_path)

        if img is None: 
            raise FileNotFoundError(f"Could not read image: {image_path}")
        
        h, w = img.shape[:2]
        probs, labels = self.clf.scores(img)
        top_idx = np.argsort(probs)[::-1][:max(1, self.cfg.topk)]
        heat_union = np.zeros((h, w), dtype = np.float32)
        top_labels = [labels[i] for i in top_idx]
        top_scores = [float(probs[i]) for i in top_idx]

        for i in top_idx:
            score_fn = self.clf.score_fn_for_label(i)
            heat = self.ocam.saliency(img, score_fn)
            heat_union = np.maximum(heat_union, heat)

        mask = self._heat_to_mask(heat_union, self.cfg.mask_top_p, self.cfg.dilate)
        rects = self._mask_to_rects(mask)
        for (x,y,ww,hh) in rects:
            m = Mask(x,y,ww,hh)
            if self.cfg.blur_method == 'gaussian': 
                apply_gaussian_blur(img, m, ksize=self.cfg.blur_strength)
            else: 
                apply_mosaic_blur(img, m, block_size=self.cfg.blur_strength)

        return {'path': image_path, 'image': img, 'top_labels': top_labels, 'top_scores': top_scores,
                'num_regions': len(rects), 'mask_coverage': float(mask.mean()/255.0)}
