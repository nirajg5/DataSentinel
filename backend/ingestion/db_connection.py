from sqlalchemy import create_engine

DB_USER = "postgres"
DB_PASSWORD = "0555"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "data_observability"

DATABASE_URL = (
    f"postgresql://{DB_USER}:{DB_PASSWORD}"
    f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

engine = create_engine(DATABASE_URL)

def get_engine():
    return engine