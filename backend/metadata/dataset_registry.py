DATASET_REGISTRY = {

    "bronze_customers": {
        "layer": "BRONZE",
        "description": "Raw customer dataset",
        "owner": "Data Engineering Team",
        "tags": "customer,raw,bronze",
        "source": "CSV",
        "frequency": "Daily",
        "sla": 24
    },

    "bronze_products": {
        "layer": "BRONZE",
        "description": "Raw product dataset",
        "owner": "Data Engineering Team",
        "tags": "product,raw,bronze",
        "source": "CSV",
        "frequency": "Daily",
        "sla": 24
    },

    "bronze_orders": {
        "layer": "BRONZE",
        "description": "Raw order dataset",
        "owner": "Data Engineering Team",
        "tags": "order,raw,bronze",
        "source": "CSV",
        "frequency": "Daily",
        "sla": 24
    },

    "silver_customers": {
        "layer": "SILVER",
        "description": "Clean customer dataset",
        "owner": "Data Engineering Team",
        "tags": "customer,clean,silver",
        "source": "PostgreSQL",
        "frequency": "Daily",
        "sla": 12
    },

    "silver_products": {
        "layer": "SILVER",
        "description": "Clean product dataset",
        "owner": "Data Engineering Team",
        "tags": "product,clean,silver",
        "source": "PostgreSQL",
        "frequency": "Daily",
        "sla": 12
    },

    "silver_orders": {
        "layer": "SILVER",
        "description": "Clean order dataset",
        "owner": "Data Engineering Team",
        "tags": "order,clean,silver",
        "source": "PostgreSQL",
        "frequency": "Daily",
        "sla": 12
    },

    "gold_sales_summary": {
        "layer": "GOLD",
        "description": "Business sales summary",
        "owner": "Analytics Team",
        "tags": "sales,gold,analytics",
        "source": "Warehouse",
        "frequency": "Daily",
        "sla": 6
    }
}