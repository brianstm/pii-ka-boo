import os
from typing import List, Iterable
from transformers import pipeline
from core.types import BBox, PIIType

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")

class PiiranhaDetector:

    def __init__(
        self,
        model_name: str = "iiiorg/piiranha-v1-detect-personal-information",
        target_entities: Iterable[str] = None,
        min_confidence_score: float = 0.50
    ):
        self.pipe = pipeline(
            task="token-classification",
            model=os.path.join(MODEL_DIR, model_name),
            tokenizer=model_name
        )
        self.target = set(e.upper() for e in (target_entities or []))
        self.min_confidence_score = float(min_confidence_score)

    def detect(self, ocr: List[BBox]) -> List[PIIType]:
        tags: List[PIIType] = []
        for i, box in enumerate(ocr):
            text = (box.text or "").strip()
            if not text:
                continue

            results = self.pipe(text)
            print(results)
            best = {}
            for r in results:
                label = (r.get("entity_group") or r.get("entity") or "").upper()
                score = float(r["score"])
                if self.target and label not in self.target:
                    continue
                if score >= self.min_confidence_score and score > best.get(label, 0.0):
                    best[label] = score

            for label, score in best.items():
                tags.append(PIIType(entity_type=label, score=score, box_index=i))
        return tags
