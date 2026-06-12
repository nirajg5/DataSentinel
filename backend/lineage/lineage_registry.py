LINEAGE_REGISTRY = [

    {
        "source": "customers.csv",
        "target": "bronze_customers",
        "transformation": "CSV Ingestion"
    },

    {
        "source": "products.csv",
        "target": "bronze_products",
        "transformation": "CSV Ingestion"
    },

    {
        "source": "orders.csv",
        "target": "bronze_orders",
        "transformation": "CSV Ingestion"
    },

    {
        "source": "bronze_customers",
        "target": "silver_customers",
        "transformation": "Cleaning & Deduplication"
    },

    {
        "source": "bronze_products",
        "target": "silver_products",
        "transformation": "Cleaning & Deduplication"
    },

    {
        "source": "bronze_orders",
        "target": "silver_orders",
        "transformation": "Cleaning & Deduplication"
    },

    {
        "source": "silver_customers",
        "target": "gold_sales_summary",
        "transformation": "Customer Aggregation"
    },

    {
        "source": "silver_orders",
        "target": "gold_sales_summary",
        "transformation": "Sales Aggregation"
    },

    {
        "source": "silver_products",
        "target": "gold_sales_summary",
        "transformation": "Revenue Calculation"
    },

    {
        "source": "gold_sales_summary",
        "target": "sales_dashboard",
        "transformation": "Dashboard Consumption"
    }
]