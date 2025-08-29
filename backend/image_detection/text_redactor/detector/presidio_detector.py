from typing import List, Iterable
from core.types import BBox, PIIType

from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider

class PresidioDetector:

    def __init__(self, language: str = "en", target_entities: Iterable[str] = None, min_confidence_score: float = 0.5):

        nlp_configuration = {
            "nlp_engine_name": "spacy",
            "models": [{"lang_code": language, "model_name": f"{language}_core_web_lg"}],
        }

        provider = NlpEngineProvider(nlp_configuration=nlp_configuration)
        nlp_engine = provider.create_engine()

        self.analyzer = AnalyzerEngine(nlp_engine=nlp_engine, supported_languages=[language])
        self.language = language
        self.target = set(target_entities or ["PERSON","EMAIL_ADDRESS","PHONE_NUMBER","CREDIT_CARD", "IP_ADDRESS","LOCATION"])
        self.min_confidence_score = float(min_confidence_score)

    def detect(self, ocr: List[BBox]) -> List[PIIType]:
        tags: List[PIIType] = []
        for i, box in enumerate(ocr):
            if not box.text.strip():
                continue
            results = self.analyzer.analyze(text=box.text, language=self.language)
            for r in results:
                if r.entity_type in self.target and r.score >= self.min_confidence_score:   
                    tags.append(PIIType(entity_type=r.entity_type, score=float(r.score), box_index=i))
        return tags
