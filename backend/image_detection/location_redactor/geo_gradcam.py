from typing import List, Tuple, Optional
import os, torch, numpy as np, cv2

from transformers import CLIPModel, CLIPProcessor
from pytorch_grad_cam import GradCAM, EigenCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget

def _vit_reshape_transform(tensor):
    if tensor.dim() == 4:
        return tensor
    b, n, c = tensor.shape
    s = int((n - 1) ** 0.5)
    return tensor[:, 1:, :].permute(0, 2, 1).reshape(b, c, s, s)

class _StreetCLIPForCAM(torch.nn.Module):
    def __init__(self, model: CLIPModel, text_inputs: dict):
        super().__init__()
        self.model = model
        self.register_buffer("input_ids", text_inputs["input_ids"], persistent=False)
        self.register_buffer("attention_mask", text_inputs["attention_mask"], persistent=False)

    def forward(self, pixel_values: torch.Tensor):
        out = self.model(pixel_values=pixel_values,
                         input_ids=self.input_ids,
                         attention_mask=self.attention_mask)
        return out.logits_per_image  # [B, num_labels]

class StreetCLIPGradCAM:
    def __init__(self, labels: List[str], device: Optional[str] = None,
                 model_id: Optional[str] = None, method: str = "gradcam"):
        self.device = torch.device(device or os.getenv("STREETCLIP_DEVICE", "cpu"))
        self.model_id = model_id or os.getenv("STREETCLIP_MODEL", "geolocal/StreetCLIP")
        local_only = os.getenv("HF_LOCAL_ONLY", "0") == "1"

        self.model = CLIPModel.from_pretrained(self.model_id, local_files_only=local_only).to(self.device).eval()
        self.proc  = CLIPProcessor.from_pretrained(self.model_id, local_files_only=local_only)

        self.labels = labels
        text_inputs = self.proc(text=labels, return_tensors="pt", padding=True)
        for k in text_inputs: 
            text_inputs[k] = text_inputs[k].to(self.device)

        self.wrapper = _StreetCLIPForCAM(self.model, text_inputs)

        print(self.model)
        target_layers = [self.model.vision_model.encoder.layers[-1].layer_norm2]
        if method.lower() == "eigen":
            self.cam = EigenCAM(self.wrapper, target_layers, reshape_transform=_vit_reshape_transform)
        else:
            self.cam = GradCAM(self.wrapper, target_layers, reshape_transform=_vit_reshape_transform)

    @torch.no_grad()
    def _pixel_values(self, img_bgr: np.ndarray) -> torch.Tensor:
        from PIL import Image
        pil = Image.fromarray(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
        pv = self.proc(images=pil, return_tensors="pt")["pixel_values"].to(self.device)
        return pv

    def scores(self, img_bgr: np.ndarray) -> Tuple[np.ndarray, List[str]]:
        pv = self._pixel_values(img_bgr)
        logits = self.wrapper(pv)
        probs  = torch.softmax(logits, dim=1).squeeze(0).cpu().detach().numpy()
        return probs, self.labels
    
    def score_fn_for_label(self, label_idx: int):
        def _score_fn(img_bgr):
            probs,_ = self.scores(img_bgr)
            return float(probs[label_idx])
        return _score_fn

    def heatmap(self, img_bgr: np.ndarray, label_idx: int) -> np.ndarray:
        pv = self._pixel_values(img_bgr)
        grayscale_cam = self.cam(input_tensor=pv, targets=[ClassifierOutputTarget(label_idx)])
        heat = grayscale_cam[0]
        return cv2.resize(heat, (img_bgr.shape[1], img_bgr.shape[0]), interpolation=cv2.INTER_CUBIC)
