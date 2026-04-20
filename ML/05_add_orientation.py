import pandas as pd
import ast
import os

# load
df_master = pd.read_csv("data/silver/master_clean.csv")
df_or = pd.read_csv("data/bronze/orientation_profiles_2026-03-27.csv")

print("MASTER:", df_master.shape)
print("ORIENTATION RAW:", df_or.shape)

# parse scores
df_or["scores_dict"] = df_or["scores"].apply(ast.literal_eval)

def extract_scores(score_dict):
    motivation = score_dict.get("motivation", {}) if isinstance(score_dict, dict) else {}
    return pd.Series({
        "profile_id": None,
        "D1": score_dict.get("D1"),
        "D2": score_dict.get("D2"),
        "D3": score_dict.get("D3"),
        "D4": score_dict.get("D4"),
        "D5": score_dict.get("D5"),
        "D6_result": motivation.get("result"),
        "D6_learning": motivation.get("learning"),
        "D6_relation": motivation.get("relation"),
    })

df_scores = df_or["scores_dict"].apply(extract_scores)
df_scores["profile_id"] = df_or["user_id"]

# aggiungi suggested_role
df_scores["suggested_role"] = df_or["suggested_role"]

# una riga per utente
df_scores = df_scores.drop_duplicates(subset=["profile_id"])

print("\nORIENTATION SCORES:", df_scores.shape)
print("Con suggested_role:", df_scores["suggested_role"].notna().sum())

# merge
df_master = df_master.merge(df_scores, on="profile_id", how="left")

print("\nAFTER MERGE:", df_master.shape)
print("Con orientation complete:", df_master.dropna(
    subset=["D1", "D2", "D3", "D4", "D5", "D6_result", "D6_learning", "D6_relation"]
).shape[0])

# save
os.makedirs("data/silver", exist_ok=True)
df_master.to_csv("data/silver/master_with_orientation.csv", index=False)

print("\nSalvato: data/silver/master_with_orientation.csv")