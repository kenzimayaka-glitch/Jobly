"""15 autonomous movement families."""
MOVEMENTS=("Réactif","Délibératif","Prédéfini","Réflexe","Intentionnel","Exploratoire/Aléatoire","Hybride","Linéaire","Rotationnel","Séquentiel","Parallèle","Hiérarchique","Émergent","Adaptatif non-contextuel","Proactif")
def choose_movement_autonomously(rng,tick):
    return MOVEMENTS[tick-1] if tick<=len(MOVEMENTS) else rng.choice(MOVEMENTS)
