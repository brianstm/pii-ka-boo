from typing import List, Tuple
import numpy as np
import cv2
import easyocr

from image_detection.core.types import BBox

class EasyOCREngine:

    def __init__(self, langs = None, detail: int = 1):

        self.easyocr = easyocr
        self.reader = easyocr.Reader(langs, gpu = False)
        self.detail = detail

    def extract(self, image_path: str) -> List[BBox]:
        results = self.reader.readtext(image_path, detail = self.detail)
        ocr_boxes: List[BBox] = []
        for item in results:
            try:
                bbox, text, conf = item
            except Exception:
                bbox, text = item
                conf = 1.0
            print(text)
            bbox_tuples = [(int(x), int(y)) for (x, y) in bbox]
            ocr_boxes.append(BBox(text = text, bbox = bbox_tuples, confidence = float(conf)))
        return ocr_boxes
