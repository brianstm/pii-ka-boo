python -m venv .venv
.\.venv\Scripts\activate
pip install --upgrade pip pip install "torch==2.3.1" --index-url https://download.pytorch.org/whl/cpu # CPU build example
pip install "transformers>=4.38" "tokenizers>=0.15.2" "huggingface-hub>=0.23" "safetensors>=0.4.2"

adding a large folder into git that exceeds 100MB:
git lfs track folder/\
git add .gitattributes
git add data/
git commit -m "Track data folder with Git LFS"
