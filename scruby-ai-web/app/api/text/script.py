# hello.py

import sys
import json
import re
from collections import defaultdict

from transformers import AutoTokenizer, AutoModelForTokenClassification
import torch

MODEL_DIR = "./app/api/text/pii-ner-fast"  # <- path to your saved model folder

tok = AutoTokenizer.from_pretrained(MODEL_DIR)
mdl = AutoModelForTokenClassification.from_pretrained(MODEL_DIR)
mdl.eval()

def extend_spans_to_word_end(spans, text, labels={"NAME","ADDRESS", "PHONE", "URL_PERSONAL", "USERNAME"}):
    """
    If a span ends in the middle of a word (common with subword splits),
    extend it to the end of that word. E.g., '[NAME]onggo' -> '[NAME]'.
    """
    out = []
    for s in spans:
        if s["label"] in labels:
            end = s["end"]
            L = len(text)
            # extend while next char is a word char or common name/addr joiners
            while end < L and re.match(r"[A-Za-z0-9'’-]", text[end]):
                end += 1
            s = {"start": s["start"], "end": end, "label": s["label"]}
        out.append(s)
    return out

def coalesce_same_label_spans(spans, text, max_gap_chars=2):
    """
    Merge consecutive spans with the same label if the gap between them is tiny
    (e.g., subword tail like 'oh' or '#11'), so '[ADDRESS]oh [ADDRESS]113' -> '[ADDRESS]'.
    """
    if not spans:
        return spans
    spans = sorted(spans, key=lambda s: (s["start"], s["end"]))
    merged = [spans[0]]

    for s in spans[1:]:
        prev = merged[-1]
        if s["label"] == prev["label"]:
            gap = text[prev["end"]:s["start"]]
            # allow tiny tails: up to N alnum or -/#, with optional surrounding whitespace
            if re.fullmatch(rf"\s*[-/#A-Za-z0-9]{{0,{max_gap_chars}}}\s*", gap):
                # extend previous span to include gap + current span
                prev["end"] = s["end"]
                continue
        merged.append(s)
    return merged

def predict_tags(text: str):
    enc = tok(text, return_offsets_mapping=True, return_tensors="pt", truncation=True, max_length=512)
    with torch.no_grad():
        out = mdl(input_ids=enc["input_ids"], attention_mask=enc["attention_mask"])
    pred_ids = out.logits.argmax(-1)[0].tolist()
    tags = [mdl.config.id2label[int(i)] for i in pred_ids]

    # drop special tokens (offsets == (0,0))
    offsets = enc["offset_mapping"][0].tolist()
    toks, clean_tags, clean_offs = [], [], []
    for (s,e), tag in zip(offsets, tags):
        if s==0 and e==0:  # skip special tokens
            continue
        toks.append(text[s:e]); clean_tags.append(tag); clean_offs.append((s,e))
    return toks, clean_tags, clean_offs


# Merge BIO → character spans
def bio_to_char_spans(offsets, tags):
    spans, cur = [], None
    for (s,e), tag in zip(offsets, tags):
        if tag.startswith("B-"):
            if cur: spans.append(cur)
            cur = {"start": s, "end": e, "label": tag.split("-",1)[1]}
        elif tag.startswith("I-"):
            ent = tag.split("-",1)[1]
            if cur and cur["label"] == ent and s <= cur["end"] + 1:
                cur["end"] = e
            else:
                cur = {"start": s, "end": e, "label": ent}
        else:
            if cur: spans.append(cur); cur = None
    if cur: spans.append(cur)
    return spans

# High-precision regex for structured PII
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
PHONE_RE = re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{1,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b")
URL_RE   = re.compile(r"\bhttps?://[^\s]+", re.I)
HANDLE_RE= re.compile(r"@\w{1,32}")

def regex_spans(text):
    out = []
    for m in EMAIL_RE.finditer(text):
        out.append({"start": m.start(), "end": m.end(), "label": "EMAIL"})
    for m in PHONE_RE.finditer(text):
        out.append({"start": m.start(), "end": m.end(), "label": "PHONE"})
    for m in URL_RE.finditer(text):
        out.append({"start": m.start(), "end": m.end(), "label": "URL_PERSONAL"})
    for m in HANDLE_RE.finditer(text):
        out.append({"start": m.start(), "end": m.end(), "label": "USERNAME"})
    return out

def ner_spans(text):
    toks, tags, offs = predict_tags(text)
    return bio_to_char_spans(offs, tags)

def merge_spans(spans):
    spans = sorted(spans, key=lambda s: (s["start"], -(s["end"]-s["start"])))
    merged = []
    for s in spans:
        if not merged or s["start"] >= merged[-1]["end"]:
            merged.append(s)
        else:
            if (s["end"]-s["start"]) > (merged[-1]["end"]-merged[-1]["start"]):
                merged[-1] = s
    return merged

def redact(text, style="tags"):
    # regex for EMAIL/PHONE/URL/USERNAME + NER for NAME/ADDRESS (+ any extras the model finds)
    r = regex_spans(text)
    n = ner_spans(text)

    keep = r[:]  # always keep structured regex hits
    covered = {(s["start"], s["end"]) for s in r}
    for s in n:
        # Always include model-detected NAME/ADDRESS; include others if regex didn't already catch
        if s["label"] in {"NAME","ADDRESS"} or (s["start"], s["end"]) not in covered:
            keep.append(s)

    spans = merge_spans(keep)
    spans = coalesce_same_label_spans(spans, text, max_gap_chars=2)
    spans = extend_spans_to_word_end(spans, text)

    # Create a mapping from original text to entity numbers
    entity_counter = defaultdict(int)
    entity_map = {}
    
    # First pass: identify unique entities and assign numbers
    for span in spans:
        entity_text = text[span["start"]:span["end"]]
        if entity_text not in entity_map:
            entity_counter[span["label"]] += 1
            entity_map[entity_text] = entity_counter[span["label"]]
        span["entity_id"] = entity_map[entity_text]

    out, last = [], 0
    for s in spans:
        out.append(text[last:s["start"]])
        if style == "tags":
            token = f"[{s['label']}_{s['entity_id']}]"
        else:
            token = "█"*(s["end"]-s["start"])
        out.append(token)
        last = s["end"]
    out.append(text[last:])
    return "".join(out), spans

def call_model(text):
    red, spans = redact(text, style="tags")
    return red

def greet(name):
    return f"Hello from Python, {name}!"

if __name__ == "__main__":
    # read argument from Node.js
    text = sys.argv[1] if len(sys.argv) > 1 else "world"
    result = call_model(text)
    print(json.dumps({"response": result}))