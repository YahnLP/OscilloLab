# Fidélité des simulations

Ce document dit **ce qui est reproduit fidèlement**, **ce qui est simplifié** et **ce qui reste à vérifier** sur les vrais appareils.

## 1. Sources de référence
| Élément | Référence |
|---|---|
| Face avant OWON SDS5032E | `docs/ref/owon-sds5032e-face-avant.jpg` + zone de commande des fiches du dépôt `ressources-pedagogiques` |
| Face avant RIGOL (DS1054Z / DS1104Z Plus : même disposition) | `docs/ref/rigol-ds1054z-photo-reelle.jpg` (appareil de l'utilisateur), `docs/ref/rigol-ds1104z-plus-face-avant.jpg` |
| Menus et comportements RIGOL | *DS1000Z User Guide* (RIGOL, éd. 2015-2019) : mémoire par nombre de voies, poussoirs des boutons, mesures (20 horizontales + 17 verticales), règles d'Auto (sinus ≥ 41 Hz, carré ≥ 20 mVpp), modes d'acquisition, menu Auto Setting |
| Mesures OWON | fiche technique SDS5032E : Vpp, Vavg, Vrms, Freq, Period, Vmax, Vmin, Vtop, Vbase, Vamp, Overshoot, Preshoot, Rise, Fall, Delay A→B ↑/↓, ±Width, ±Duty ; sensibilité 5 mV/div à 5 V/div |
| Écran OWON | capture annotée des fiches (800 × 600, voie 1 rouge, voie 2 jaune, menus bleus H1–H5 / F1–F5) |
| Écran RIGOL | capture annotée des fiches (800 × 480, voie 1 jaune, voie 2 cyan, voie 3 magenta, voie 4 bleue) |

## 2. Modèle physique
| Domaine | Modélisation |
|---|---|
| Sonde ×10 | diviseur 10 avec réseau de compensation : H(p) = 0,1 (1 + τ₁p)/(1 + τ₂p), τ₂ = 20 µs. La vis règle τ₁ ; chaque voie a sa propre capacité d'entrée, donc **chaque sonde se règle sur sa voie** |
| Sonde ×1 | pas de diviseur, bande passante limitée (5 MHz OWON, 6 MHz RIGOL) |
| Face avant analogique | passe-bas du 1er ordre (30 MHz OWON, 100 MHz RIGOL), limite 20 MHz optionnelle, couplage AC (retrait de la valeur moyenne), GND |
| CAN | 8 bits (32 niveaux par carreau), écrêtage à ±4,2 carreaux, bruit de 0,4 mV + 0,3 % de la sensibilité |
| Échantillonnage | OWON : 250 MS/s max, 10 k points → cadence = min(250 MS/s ; 10 k / durée écran) : **repliement possible** aux bases lentes. RIGOL DS1054Z : 1 GSa/s (1 voie), 500 MSa/s (2 voies), 250 MSa/s (3–4 voies) ; mémoire 12 Mpts (1 voie), 6 Mpts (2 voies), 3 Mpts (3–4 voies) ; profondeur « Auto » 3 Mpts dès 2 voies (relevé sur l'écran de l'appareil réel) |
| Déclenchement | balayage continu du signal, détection de franchissement du niveau avec interpolation, pente montante / descendante / les deux, temps mort (holdoff), Auto / Normal / Single, Force ; Auto sans déclenchement : image non synchronisée |
| Mode Roll | à partir de 100 ms/div (OWON) et 200 ms/div (RIGOL) : pas de déclenchement, défilement |
| Mesures | calculées sur les données **affichées**. Vtop / Vbase par histogramme, seuils à 10/50/90 %. Moyenne et efficace : « écran » (tout l'écran) ou « cycle » (une période entière) |
| Autoset / AUTO | RIGOL : refuse sous 41 Hz ou 20 mVpp (manuel) ; OWON : 20 Hz et 5 mV (valeurs **à vérifier**) ; vise 2 à 3 périodes et 4 carreaux de haut ; RIGOL : menu Auto Setting avec Undo |
| Boutons | sens horaire = V/div et s/div plus petits ; RIGOL : appui POSITION → zéro, appui LEVEL → 0 V, appui SCALE vertical → réglage fin / par paliers ; OWON : touche 50 % |

## 3. Simplifications connues
- Pas de réglage fin du V/div, pas de FFT, pas de base de temps retardée, pas d'entrée EXT, pas de voies logiques ni de décodage série.
- Déclenchement : uniquement sur front.
- Les rapports de compensation initiaux, les amplitudes de bruit et les bandes passantes de sonde sont des valeurs réalistes, **pas des mesures** sur vos appareils.
- Le compteur de fréquence matériel affiche la fréquence exacte du signal déclencheur (précision supposée parfaite).

## 4. À vérifier avec les appareils réels
- Libellés exacts et ordre des items de menu (OWON : H1–H5 et F1–F5 ; RIGOL : touches de menu à l'écran).
- Pas exact de POSITION, du niveau de déclenchement et du curseur.
- Valeurs de la sortie de compensation (OWON 5 V / 1 kHz d'après la fiche ; RIGOL 3 V / 1 kHz).
- Disposition précise de certaines touches de l'OWON (la photo est de basse résolution).

## 5. Décodeur série du RIGOL (TP 18 à 20)
- **Source :** manuel *DS1000Z User Guide* (chapitre « Protocol Decoding ») et retours d'utilisateurs : menu **MATH → Decode1 / Decode2**, décodeurs RS232 (TX, RX, polarité, endian, baud, bits de données, stop, parité, seuils, format), I2C (SCL, SDA, seuils, adresse), SPI (SS/CS, SCLK, MOSI, MISO, polarité, front, bits, endian, seuils), BusStatus, table d'événements (export CSV non simulé).
- **Option logicielle (SA-DS1000Z)** : elle n'est pas toujours activée sur l'appareil. À vérifier.
- **Reproduit :** le décodeur travaille sur ce qui est affiché ; un seuil à 0 V ou une mauvaise vitesse donnent un décodage faux ; déclenchement RS232 (bit de start), I2C (Start / Stop), SPI (CS).
- **À valider :** libellés exacts des touches (par exemple « Polarity »), seuils par défaut (0 V ici), mode SPI « Timeout » non simulé.
