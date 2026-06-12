import pandas as pd
import networkx as nx
import matplotlib.pyplot as plt

from backend.ingestion.db_connection import get_engine

engine = get_engine()

df = pd.read_sql(
    """
    SELECT
        source_dataset,
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

plt.figure(figsize=(12,8))

nx.draw(
    graph,
    with_labels=True,
    node_size=3000
)

plt.title(
    "Enterprise Data Lineage"
)

plt.show()