import pandas as pd
import json
import os

results_dir = "./results"

parts = []
for i in range(1, 5):
    path = os.path.join(results_dir, f"quality_ragas_part_{i}.csv")
    parts.append(pd.read_csv(path))

df = pd.concat(parts, ignore_index=True)

with open(os.path.join(results_dir, "quality.json"), "r", encoding="utf-8") as f:
    records = json.load(f)

records = [r for r in records if r.get("typ") == "answer" and r.get("context")]
ids = [r["id"] for r in records]

df.insert(0, "id", ids)

result = df[["id", "faithfulness", "answer_relevancy"]].copy()

result["faithfulness"] = result["faithfulness"].fillna(result["faithfulness"].mean())
result["answer_relevancy"] = result["answer_relevancy"].fillna(result["answer_relevancy"].mean())

result.to_csv(os.path.join(results_dir, "quality_ragas_final.csv"), index=False)

print(result.to_string())
print(f"\nPrůměr faithfulness:     {result['faithfulness'].mean():.3f}")
print(f"Průměr answer_relevancy: {result['answer_relevancy'].mean():.3f}")