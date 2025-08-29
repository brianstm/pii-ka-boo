import numpy as np
from enum import Enum, auto
from typing import Tuple, List
from dataclasses import dataclass

Point = Tuple[int, int]

@dataclass
class PIIType:
    entity_type: str
    score: float
    box_index: int 

@dataclass
class BBox:
    text: str
    bbox: List[Point]
    confidence: float

@dataclass
class Detection:
    bbox: BBox
    cls : str
    score: float

class Mask:
    def __init__(self, x: int, y: int, w: int, h: int):
        self.x, self.y, self.w, self.h = int(x), int(y), int(w), int(h)

    @classmethod
    def from_polygon(cls, polygon: List[Point]) -> "Mask":
        xs = [p[0] for p in polygon]
        ys = [p[1] for p in polygon]
        x_min, x_max = min(xs), max(xs)
        y_min, y_max = min(ys), max(ys)
        return cls(x_min, y_min, x_max - x_min, y_max - y_min)

    def clip(self, width: int, height: int) -> "Mask":
        x = max(0, min(self.x, width - 1))
        y = max(0, min(self.y, height - 1))
        w = max(0, min(self.w, width - x))
        h = max(0, min(self.h, height - y))
        return Mask(x, y, w, h)

    def as_slice(self):
        return slice(self.y, self.y + self.h), slice(self.x, self.x + self.w)