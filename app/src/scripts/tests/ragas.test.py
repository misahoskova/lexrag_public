import json
import pandas as pd
import math
from datasets import Dataset
from ragas import evaluate, RunConfig
from ragas.metrics import faithfulness, answer_relevancy 
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv(dotenv_path="../../../.env.local")

run_config = RunConfig(
    timeout=60,
    max_workers=2,
    max_retries=3
)

llm = ChatOpenAI(model="gpt-5.4-mini")
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

with open("./results/quality.json", "r", encoding="utf-8") as f:
    records = json.load(f)

records = [r for r in records if r.get("typ") == "answer" and r.get("context")]

unique_questions = []
for r in records:
    if r["otazka"] not in unique_questions:
        unique_questions.append(r["otazka"])

total_q = len(unique_questions)
q_per_chunk = 18 
num_chunks = math.ceil(total_q / q_per_chunk)

for i in range(num_chunks):
    start_q = i * q_per_chunk
    end_q = min((i + 1) * q_per_chunk, total_q)
    
    current_q_subset = unique_questions[start_q:end_q]
    
    chunk_records = [r for r in records if r["otazka"] in current_q_subset]
    
    print(f"Zpracovávám část {i+1}/{num_chunks} (otázky {start_q+1} až {end_q})")

    data = {
        "question": [r["otazka"] for r in chunk_records],
        "answer":   [r["odpoved"] for r in chunk_records],
        "contexts": [[r["context"]] for r in chunk_records],
    }
    subset_dataset = Dataset.from_dict(data)

    results = evaluate(
        dataset=subset_dataset,
        metrics=[faithfulness, answer_relevancy],
        llm=llm,
        embeddings=embeddings,
        run_config=run_config
    )

    output_path = f"./results/quality_ragas_part_{i+1}.csv"
    results.to_pandas().to_csv(output_path, index=False)
    print(f"Část {i+1} uložena do {output_path}")

print("\nVšechny části byly úspěšně zpracovány!")
