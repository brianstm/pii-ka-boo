import cv2
import numpy as np
from image_detection.core.types import Mask

def apply_gaussian_blur(img: np.ndarray, mask: Mask, ksize: int = 31) -> None:
    # ksize must be odd
    if ksize % 2 == 0:
        ksize += 1
    ys, xs = mask.as_slice()
    roi = img[ys, xs]
    if roi.size == 0:
        return
    blurred = cv2.GaussianBlur(roi, (ksize, ksize), 0)
    img[ys, xs] = blurred