import pandas as pd
import ast

df = pd.read_csv("data/bronze/derived_features_2026-03-24.csv")

print("COLUMNS:")
print(df.columns.tolist())

print("\nGAME_ID VALUE COUNTS:")
print(df["game_id"].value_counts(dropna=False))

# filtro solo gonogo
df_gonogo = df[df["game_id"] == "gonogo"].copy()

print("\nGONOGO SHAPE:", df_gonogo.shape)

# parse features
df_gonogo["features_dict"] = df_gonogo["features"].apply(ast.literal_eval)

print("\nESEMPIO FEATURES GONOGO:")
print(df_gonogo["features_dict"].iloc[0])

# opzionale: espandi colonne
df_expanded = df_gonogo["features_dict"].apply(pd.Series)

print("\nCOLONNE FEATURES GONOGO:")
print(df_expanded.columns.tolist())

print("\nPRIME RIGHE ESPANSE:")
print(df_expanded.head())


df_triage = df[df["game_id"] == "triage"].copy()

df_triage["features_dict"] = df_triage["features"].apply(ast.literal_eval)

df_triage_exp = df_triage["features_dict"].apply(pd.Series)

print("TRIAGE COLUMNS:")
print(df_triage_exp.columns.tolist())

print("\nESEMPIO TRIAGE:")
print(df_triage_exp.iloc[0])

df_neg = df[df["game_id"] == "negotiation"].copy()

df_neg["features_dict"] = df_neg["features"].apply(ast.literal_eval)

df_neg_exp = df_neg["features_dict"].apply(pd.Series)

print("NEGOTIATION COLUMNS:")
print(df_neg_exp.columns.tolist())

print("\nESEMPIO NEGOTIATION:")
print(df_neg_exp.iloc[0])