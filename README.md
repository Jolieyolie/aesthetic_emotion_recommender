# aesthetic_emotion_recommender

Standalone PyTorch prototype notebook:

- `hybrid_collaborative_filtering_recommender.ipynb`

Expected ratings input:

- path: `data/ratings_matrix.csv`
- shape: users x items
- first column: user id, preferably named `user_id`
- item columns: item ids matching `data/llm_emotion_embeddings.csv`
- values: `1` means like, `0` means dislike, blank/`NaN` means unseen

The existing `data/llm_emotion_embeddings.csv` file is used as the item feature matrix:

- one row per item
- `id` column
- 21 numeric aesthetic-emotion feature columns

The notebook can fine-tune these 21 emotion values with:

- `TRAINABLE_ITEM_FEATURES = True`
- `FEATURE_ANCHOR_L2 = 1e-3`

This initializes item emotion values from the LLM ratings, then lets training move them while penalizing large drift from the initialization. The notebook includes a feature-drift report to inspect which emotion dimensions changed most.

Install dependencies:

```bash
pip install -r requirements.txt
```
