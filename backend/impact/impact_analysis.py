import pandas as pd
import networkx as nx

from sqlalchemy import text

from backend.ingestion.db_connection import get_engine

engine = get_engine()

print("Starting Impact Analysis")

# ==========================================
# Load Lineage Data
# ==========================================

lineage_df = pd.read_sql(
    """
    SELECT
        source_dataset,
        target_dataset
    FROM data_lineage
    """,
    engine
)

# ==========================================
# Build Dependency Graph
# ==========================================

graph = nx.DiGraph()

for _, row in lineage_df.iterrows():

    graph.add_edge(
        row["source_dataset"],
        row["target_dataset"]
    )

print(
    f"Loaded {len(graph.nodes())} nodes "
    f"and {len(graph.edges())} relationships"
)

# ==========================================
# Get Open Incidents
# ==========================================

incidents = pd.read_sql(
    """
    SELECT
        incident_id,
        dataset_name
    FROM incidents
    WHERE status = 'OPEN'
    """,
    engine
)

if incidents.empty:

    print("No Open Incidents Found")
    exit()

# ==========================================
# Analyze Each Incident
# ==========================================

for _, incident in incidents.iterrows():

    incident_id = incident["incident_id"]

    dataset = incident["dataset_name"]

    print(f"\nAnalyzing Incident {incident_id}")
    print(f"Root Dataset: {dataset}")

    # --------------------------------------
    # Check Dataset Exists in Graph
    # --------------------------------------

    if dataset not in graph:

        print(
            f"No lineage found for {dataset}"
        )

        continue

    # --------------------------------------
    # Find All Downstream Assets
    # --------------------------------------

    impacted_assets = list(
        nx.descendants(
            graph,
            dataset
        )
    )

    if len(impacted_assets) == 0:

        print(
            "No Downstream Assets Found"
        )

        continue

    # --------------------------------------
    # Save Impact Records
    # --------------------------------------

    with engine.begin() as conn:

        for asset in impacted_assets:

            existing = pd.read_sql(
                f"""
                SELECT *
                FROM impact_analysis

                WHERE incident_id = {incident_id}

                AND impacted_asset = '{asset}'
                """,
                engine
            )

            if len(existing) == 0:

                conn.execute(
                    text("""
                    INSERT INTO impact_analysis
                    (
                        incident_id,
                        root_dataset,
                        impacted_asset,
                        impact_level
                    )
                    VALUES
                    (
                        :incident_id,
                        :root_dataset,
                        :asset,
                        :impact_level
                    )
                    """),
                    {
                        "incident_id":
                            incident_id,

                        "root_dataset":
                            dataset,

                        "asset":
                            asset,

                        "impact_level":
                            "HIGH"
                    }
                )

                print(
                    f"Impact Found -> {asset}"
                )

            else:

                print(
                    f"Skipped Duplicate -> {asset}"
                )

print("\nImpact Analysis Completed")