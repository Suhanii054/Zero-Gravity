from __future__ import annotations

from pathlib import Path

import lightgbm as lgb
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error, mean_squared_error

from backend.predict import ROOT, TARGET, get_dataset


def train(output_path: Path = ROOT / "lightbgm.txt") -> dict[str, float | int | str]:
    _, features = get_dataset()
    feature_columns = [col for col in features.columns if col not in ["start_time", "end_time", TARGET]]
    split = int(len(features) * 0.82)
    train_rows = features.iloc[:split]
    valid_rows = features.iloc[split:]

    params = {
        "objective": "regression",
        "metric": "rmse",
        "learning_rate": 0.035,
        "num_leaves": 96,
        "feature_fraction": 0.9,
        "bagging_fraction": 0.86,
        "bagging_freq": 1,
        "min_data_in_leaf": 36,
        "verbosity": -1,
        "seed": 42,
    }
    train_set = lgb.Dataset(train_rows[feature_columns], label=train_rows[TARGET], feature_name=feature_columns)
    valid_set = lgb.Dataset(valid_rows[feature_columns], label=valid_rows[TARGET], reference=train_set, feature_name=feature_columns)
    model = lgb.train(
        params,
        train_set,
        num_boost_round=900,
        valid_sets=[valid_set],
        callbacks=[lgb.early_stopping(60, verbose=False)],
    )
    model.save_model(str(output_path))

    predicted = model.predict(valid_rows[feature_columns])
    mae = mean_absolute_error(valid_rows[TARGET], predicted)
    rmse = float(np.sqrt(mean_squared_error(valid_rows[TARGET], predicted)))
    mape = mean_absolute_percentage_error(valid_rows[TARGET], predicted) * 100
    return {
        "output_path": str(output_path),
        "features": len(feature_columns),
        "best_iteration": int(model.best_iteration),
        "mae": round(float(mae), 2),
        "rmse": round(float(rmse), 2),
        "mape": round(float(mape), 3),
    }


if __name__ == "__main__":
    print(train())
