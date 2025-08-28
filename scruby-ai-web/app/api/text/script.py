import re
import sys
import json
from collections import defaultdict
from transformers import AutoTokenizer, AutoModelForTokenClassification
import torch

MODEL_DIR = "./app/api/text/pii-ner-fast"

# Initialize tokenizer and model
tok = AutoTokenizer.from_pretrained(MODEL_DIR)
mdl = AutoModelForTokenClassification.from_pretrained(MODEL_DIR)
mdl.eval()

def extend_spans_to_word_end(spans, text, labels={"NAME", "ADDRESS"}):
    """Extend spans to cover complete words."""
    out = []
    for s in spans:
        if s["label"] in labels:
            end = s["end"]
            L = len(text)
            while end < L and re.match(r"[A-Za-z0-9'’-]", text[end]):
                end += 1
            s = {"start": s["start"], "end": end, "label": s["label"]}
        out.append(s)
    return out

def coalesce_same_label_spans(spans, text, max_gap_chars=2):
    """Merge adjacent spans with the same label."""
    if not spans:
        return spans
        
    spans = sorted(spans, key=lambda s: (s["start"], s["end"]))
    merged = [spans[0]]

    for s in spans[1:]:
        prev = merged[-1]
        if s["label"] == prev["label"]:
            gap = text[prev["end"]:s["start"]]
            if re.fullmatch(rf"\s*[-/#A-Za-z0-9]{{0,{max_gap_chars}}}\s*", gap):
                prev["end"] = s["end"]
                continue
        merged.append(s)
    return merged

def predict_tags(text):
    """Predict named entities using the transformer model."""
    enc = tok(text, return_offsets_mapping=True, return_tensors="pt", 
              truncation=True, max_length=512)
    with torch.no_grad():
        out = mdl(input_ids=enc["input_ids"], 
                 attention_mask=enc["attention_mask"])
    pred_ids = out.logits.argmax(-1)[0].tolist()
    tags = [mdl.config.id2label[int(i)] for i in pred_ids]

    offsets = enc["offset_mapping"][0].tolist()
    clean_tags, clean_offs = [], []
    for (s, e), tag in zip(offsets, tags):
        if s == 0 and e == 0:
            continue
        clean_tags.append(tag)
        clean_offs.append((s, e))
    return clean_tags, clean_offs

def bio_to_char_spans(offsets, tags):
    """Convert BIO tags to character spans."""
    spans, cur = [], None
    for (s, e), tag in zip(offsets, tags):
        if tag.startswith("B-"):
            if cur:
                spans.append(cur)
            cur = {"start": s, "end": e, "label": tag.split("-", 1)[1]}
        elif tag.startswith("I-"):
            ent = tag.split("-", 1)[1]
            if cur and cur["label"] == ent and s <= cur["end"] + 1:
                cur["end"] = e
            else:
                cur = {"start": s, "end": e, "label": ent}
        else:
            if cur:
                spans.append(cur)
                cur = None
    if cur:
        spans.append(cur)
    return spans

# Regex patterns for structured PII
PII_PATTERNS = {
    "EMAIL": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
    "PHONE": re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{1,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b"),
    "URL_PERSONAL": re.compile(r"\bhttps?://[^\s]+", re.I),
    "USERNAME": re.compile(r"@\w{1,32}")
}

def regex_spans(text, target_labels=None):
    """Extract PII spans using regex patterns, optionally filtered by target labels."""
    out = []
    for label, pattern in PII_PATTERNS.items():
        if target_labels and label not in target_labels:
            continue
        for m in pattern.finditer(text):
            out.append({"start": m.start(), "end": m.end(), "label": label})
    return out

def ner_spans(text, target_labels=None):
    """Get named entity recognition spans, optionally filtered by target labels."""
    tags, offs = predict_tags(text)
    spans = bio_to_char_spans(offs, tags)
    
    if target_labels:
        spans = [span for span in spans if span["label"] in target_labels]
    
    return spans

def merge_spans(spans):
    """Merge overlapping spans."""
    spans = sorted(spans, key=lambda s: (s["start"], -(s["end"] - s["start"])))
    merged = []
    for s in spans:
        if not merged or s["start"] >= merged[-1]["end"]:
            merged.append(s)
        else:
            if (s["end"] - s["start"]) > (merged[-1]["end"] - merged[-1]["start"]):
                merged[-1] = s
    return merged

def redact(text, target_labels=None):
    """
    Redact PII entities with unique identifiers.
    
    Args:
        text: Input text to redact
        target_labels: Set of labels to redact (e.g., {"NAME", "PHONE"}).
                     If None, redacts all detected PII.
    """
    # Get all available labels from both regex and NER
    all_regex_labels = set(PII_PATTERNS.keys())
    all_ner_labels = set(mdl.config.id2label.values())
    all_ner_labels = {label.split("-", 1)[1] for label in all_ner_labels if "-" in label}
    
    # If target_labels is specified, use only those labels
    if target_labels:
        target_labels = set(target_labels)
        regex_matches = regex_spans(text, target_labels)
        ner_matches = ner_spans(text, target_labels)
    else:
        # Redact all detected PII (original behavior)
        regex_matches = regex_spans(text)
        ner_matches = ner_spans(text)

    keep = regex_matches[:]
    covered = {(s["start"], s["end"]) for s in regex_matches}
    
    for s in ner_matches:
        if (s["label"] in {"NAME", "ADDRESS"} or 
            (s["start"], s["end"]) not in covered):
            keep.append(s)

    spans = merge_spans(keep)
    spans = coalesce_same_label_spans(spans, text, max_gap_chars=2)
    
    # Only extend word endings for NAME and ADDRESS if they're in target labels
    extend_labels = {"NAME", "ADDRESS"}
    if target_labels:
        extend_labels = extend_labels.intersection(target_labels)
    spans = extend_spans_to_word_end(spans, text, labels=extend_labels)

    # Count occurrences of each entity type
    entity_counters = defaultdict(int)

    for span in spans:
        label = span["label"]
        entity_counters[label] += 1
        span["entity_id"] = f"{label}_{entity_counters[label]}"

    # Build redacted text
    out, last = [], 0
    for s in sorted(spans, key=lambda x: x["start"]):
        out.append(text[last:s["start"]])
        out.append(f"[{s['entity_id']}]")
        last = s["end"]
    out.append(text[last:])
    
    return "".join(out)

if __name__ == "__main__":
    # Read arguments from Node.js
    if len(sys.argv) > 2:
        # If specific labels are provided as second argument
        text = sys.argv[1]
        labels = json.loads(sys.argv[2])  # Expecting JSON array of labels
        result = redact(text, target_labels=labels)
    elif len(sys.argv) > 1:
        # If only text is provided, redact all PII
        text = sys.argv[1]
        result = redact(text)
    else:
        result = "No input provided"
    
    print(json.dumps({"response": result}))