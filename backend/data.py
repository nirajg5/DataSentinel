import pandas as pd
import random

try:
    from faker import Faker
except ImportError as e:
    raise ImportError(
        "The faker package is required. Install it with 'pip install Faker' "
        "and ensure your environment is activated."
    ) from e

fake = Faker()

# ==========================
# CUSTOMERS (5000 rows)
# ==========================
customers = []

for i in range(1, 5001):
    customers.append([
        i,
        fake.name(),
        fake.email(),
        fake.city()
    ])

customers_df = pd.DataFrame(
    customers,
    columns=[
        "customer_id",
        "name",
        "email",
        "city"
    ]
)

# ==========================
# PRODUCTS (500 rows)
# ==========================
product_names = [
    "Laptop", "Mouse", "Keyboard", "Monitor",
    "Headphones", "Tablet", "Printer",
    "Camera", "Speaker", "SSD",
    "Hard Disk", "Router", "Smart Watch",
    "Microphone", "Webcam"
]

products = []

for i in range(101, 601):
    products.append([
        i,
        random.choice(product_names),
        random.randint(20, 3000)
    ])

products_df = pd.DataFrame(
    products,
    columns=[
        "product_id",
        "product_name",
        "price"
    ]
)

# ==========================
# ORDERS (50000 rows)
# ==========================
orders = []

for i in range(1001, 51001):
    orders.append([
        i,
        random.randint(1, 5000),
        random.randint(101, 600),
        random.randint(1, 10),
        fake.date_between(
            start_date="-2y",
            end_date="today"
        )
    ])

orders_df = pd.DataFrame(
    orders,
    columns=[
        "order_id",
        "customer_id",
        "product_id",
        "quantity",
        "order_date"
    ]
)

# ==========================
# SAVE DATASETS
# ==========================
customers_df.to_csv(
    "data/raw/customers.csv",
    index=False
)

products_df.to_csv(
    "data/raw/products.csv",
    index=False
)

orders_df.to_csv(
    "data/raw/orders.csv",
    index=False
)

print("✅ customers.csv :", len(customers_df))
print("✅ products.csv  :", len(products_df))
print("✅ orders.csv    :", len(orders_df))