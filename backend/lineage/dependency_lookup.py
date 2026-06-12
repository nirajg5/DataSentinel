import pandas as pd
import networkx as nx

from backend.ingestion.db_connection import get_engine

engine = get_engine()

dataset = input("Enter Dataset Name: ")

df = pd.read_sql(
    """
    SELECT source_dataset,
           target_dataset
    FROM data_lineage
    """,
    engine
)

graph = nx.DiGraph()

for _, row in df.iterrows():
    graph.add_edge(
        row["source_dataset"],
        row["target_dataset"]
    )

if dataset not in graph:
    print("Dataset not found")
else:

    impacted = list(
        nx.descendants(graph, dataset)
    )

    print("\nAll Impacted Assets:\n")

    for asset in impacted:
        print(asset)