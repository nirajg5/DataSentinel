import joblib

import pandas as pd

from sklearn.ensemble import RandomForestClassifier

df = pd.read_csv(
    "training_data.csv"
)

X = df[
    [
        "reliability_score",
        "freshness_score",
        "incident_count",
        "sla_breach_count"
    ]
]

y = df["failure_label"]

model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)

model.fit(X, y)

joblib.dump(
    model,
    "models/failure_prediction.pkl"
)

print(
    "Model Trained Successfully"
)