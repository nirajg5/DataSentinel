CREATE TABLE IF NOT EXISTS bronze_customers (
    customer_id INT,
    name VARCHAR(100),
    email VARCHAR(150),
    city VARCHAR(100),
    ingestion_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bronze_products (
    product_id INT,
    product_name VARCHAR(150),
    price NUMERIC,
    ingestion_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bronze_orders (
    order_id INT,
    customer_id INT,
    product_id INT,
    quantity INT,
    order_date DATE,
    ingestion_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);