import cv2
import numpy as np
from core.types import Mask

def apply_mosaic_blur(img: np.ndarray, mask: Mask, block_size: int = 25) -> None:
    ys, xs = mask.as_slice()
    roi = img[ys, xs]
    if roi.size == 0:
        return
    h, w = roi.shape[:2]
    bs = max(2, block_size)
    roi_small = cv2.resize(roi, (max(1, w // bs), max(1, h // bs)), interpolation=cv2.INTER_LINEAR)
    roi_pix = cv2.resize(roi_small, (w, h), interpolation=cv2.INTER_NEAREST)
    img[ys, xs] = roi_pix