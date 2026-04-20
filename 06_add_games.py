import pandas as pd
import ast
import os

# -----------------------------
# LOAD
# -----------------------------
df_master = pd.read_csv("data/silver/master_with_orientation.csv")
df_games = pd.read_csv("data/bronze/derived_features_2026-03-27.csv")

print("MASTER:", df_master.shape)
print("GAMES RAW:", df_games.shape)
print("\nGAME_ID COUNTS:")
print(df_games["game_id"].value_counts(dropna=False))

# -----------------------------
# PARSE FEATURES
# -----------------------------
df_games = df_games.copy()
df_games["features_dict"] = df_games["features"].apply(ast.literal_eval)

# utility
def expand_features(df_subset: pd.DataFrame) -> pd.DataFrame:
    """
    Espande la colonna features_dict in colonne tabellari e aggiunge profile_id.
    """
    df_exp = df_subset["features_dict"].apply(pd.Series)
    df_exp["profile_id"] = df_subset["profile_id"].values
    return df_exp

# -----------------------------
# TRIAGE
# -----------------------------
df_triage = df_games[df_games["game_id"] == "triage"].copy()
df_triage_exp = expand_features(df_triage)

print("\nTRIAGE EXPANDED:", df_triage_exp.shape)

# costruzione feature triage
df_triage_feat = pd.DataFrame()
df_triage_feat["profile_id"] = df_triage_exp["profile_id"]

# qualità decisionale
df_triage_feat["triage_decision_quality"] = df_triage_exp.get("accuracy")

# adattamento strategico al feedback
triage_switch_cols = [
    c for c in ["switch_after_win_rate", "switch_after_loss_rate"]
    if c in df_triage_exp.columns
]
if triage_switch_cols:
    df_triage_feat["triage_strategy_adaptation"] = (
        df_triage_exp[triage_switch_cols].mean(axis=1)
    )
else:
    df_triage_feat["triage_strategy_adaptation"] = pd.NA

# velocità decisionale (invertita: maggiore = più veloce)
if "decision_latency_mean_ms" in df_triage_exp.columns:
    df_triage_feat["triage_decision_speed"] = 1 / (
        df_triage_exp["decision_latency_mean_ms"] + 1
    )
else:
    df_triage_feat["triage_decision_speed"] = pd.NA

# aggregazione per utente
df_triage_agg = df_triage_feat.groupby("profile_id", as_index=False).mean()
print("TRIAGE AGG:", df_triage_agg.shape)

# -----------------------------
# GONOGO
# -----------------------------
df_gonogo = df_games[df_games["game_id"] == "gonogo"].copy()
df_gonogo_exp = expand_features(df_gonogo)

print("\nGONOGO EXPANDED:", df_gonogo_exp.shape)

df_gonogo_feat = pd.DataFrame()
df_gonogo_feat["profile_id"] = df_gonogo_exp["profile_id"]

# controllo inibitorio
df_gonogo_feat["gonogo_inhibition_control"] = df_gonogo_exp.get("inhibition_index_01")

# stabilità attentiva (meno omissioni = meglio)
if "miss_rate" in df_gonogo_exp.columns:
    df_gonogo_feat["gonogo_attention_stability"] = 1 - df_gonogo_exp["miss_rate"]
else:
    df_gonogo_feat["gonogo_attention_stability"] = pd.NA

# stabilità della risposta (meno variabilità RT = meglio)
if "rt_variability" in df_gonogo_exp.columns:
    df_gonogo_feat["gonogo_response_stability"] = 1 / (
        df_gonogo_exp["rt_variability"] + 1
    )
else:
    df_gonogo_feat["gonogo_response_stability"] = pd.NA

df_gonogo_agg = df_gonogo_feat.groupby("profile_id", as_index=False).mean()
print("GONOGO AGG:", df_gonogo_agg.shape)

# -----------------------------
# NEGOTIATION
# -----------------------------
df_neg = df_games[df_games["game_id"] == "negotiation"].copy()
df_neg_exp = expand_features(df_neg)

print("\nNEGOTIATION EXPANDED:", df_neg_exp.shape)

df_neg_feat = pd.DataFrame()
df_neg_feat["profile_id"] = df_neg_exp["profile_id"]

# orientamento relazionale / bilanciamento interattivo
df_neg_feat["neg_interaction_balance"] = df_neg_exp.get("sri_01")

# spinta decisionale / assertività
df_neg_feat["neg_decision_drive"] = df_neg_exp.get("sdi_01")

# qualità dell'esito
df_neg_feat["neg_outcome_quality"] = df_neg_exp.get("oi_01")

df_neg_agg = df_neg_feat.groupby("profile_id", as_index=False).mean()
print("NEGOTIATION AGG:", df_neg_agg.shape)

# -----------------------------
# MERGE FINALE NEL MASTER
# -----------------------------
df_master = df_master.merge(df_triage_agg, on="profile_id", how="left")
df_master = df_master.merge(df_gonogo_agg, on="profile_id", how="left")
df_master = df_master.merge(df_neg_agg, on="profile_id", how="left")

print("\nAFTER MERGE:", df_master.shape)

game_feature_cols = [
    "triage_decision_quality",
    "triage_strategy_adaptation",
    "triage_decision_speed",
    "gonogo_inhibition_control",
    "gonogo_attention_stability",
    "gonogo_response_stability",
    "neg_interaction_balance",
    "neg_decision_drive",
    "neg_outcome_quality",
]

available_game_cols = [c for c in game_feature_cols if c in df_master.columns]

print("Con almeno una feature gioco:", df_master.dropna(subset=available_game_cols, how="all").shape[0])
print("Con tutte le feature gioco complete:", df_master.dropna(subset=available_game_cols).shape[0])

print("\nMissing per feature gioco:")
print(df_master[available_game_cols].isna().sum())

# -----------------------------
# SAVE
# -----------------------------
os.makedirs("data/silver", exist_ok=True)
df_master.to_csv("data/silver/master_with_games.csv", index=False)

print("\nSalvato: data/silver/master_with_games.csv")

