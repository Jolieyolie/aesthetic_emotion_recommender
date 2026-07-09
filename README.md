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

Install dependencies:

```bash
pip install -r requirements.txt
```
