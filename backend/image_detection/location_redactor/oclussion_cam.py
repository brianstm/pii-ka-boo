import numpy as np
import cv2

class OcclusionCAM:

    def __init__(self, window: int = 64, stride: int = 32, fill: str = "blur"):
        self.window = int(window)
        self.stride = int(stride)
        assert fill in {"blur","gray","mean"}
        self.fill = fill

    def _occlude(self, img, x, y):
        h, w = img.shape[:2]

        x2 = min(w, x + self.window)
        y2 = min(h, y + self.window)

        out = img.copy()
        
        roi = out[y : y2, x : x2]

        if self.fill == "blur":
            k = max(3, (self.window//5) * 2 + 1)
            roi[:] = cv2.GaussianBlur(roi,(k,k),0)
        elif self.fill == "gray":
            roi[:] = 127
        else:
            roi[:] = roi.mean(axis=(0,1), keepdims=True)

        out[y : y2, x : x2] = roi
        return out
    
    def saliency(self, img, score_fn):
        h, w = img.shape[:2]
        baseline = float(score_fn(img))

        gh = max(1, (h-1)//self.stride+1)
        gw = max(1, (w-1)//self.stride+1)

        heat = np.zeros((gh, gw),dtype=np.float32)
        for gy, y in enumerate(range(0, h, self.stride)):
            for gx, x in enumerate(range(0, w, self.stride)):
                s = float(score_fn(self._occlude(img, x, y)))
                heat[gy, gx] = max(0.0, baseline - s)

        if heat.max() > 1e-9: 
            heat /= heat.max()

        return cv2.resize(heat, (w, h), interpolation = cv2.INTER_CUBIC)
