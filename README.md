# OscilloLab — simulateur des oscilloscopes OWON SDS5032E(V) et RIGOL DS1054Z

Auteur : Yahn LE PRETTRE, Enseignant à la MFR de Pontonx — licence CC BY-NC-SA 4.0.

Simulateur **hors ligne** (HTML/CSS/JS pur, aucune dépendance), dans l'esprit d'**ElectroLab** : on apprend à **régler l'oscilloscope** sur l'appareil lui-même, avec des **TP corrigés automatiquement**.

- Deux faces avant interactives : **OWON SDS5032E(V)** (2 voies, 30 MHz, 250 MS/s, 10 k points) et **RIGOL DS1054Z / Plus** (4 voies, 100 MHz, 1 GSa/s, 24 Mpts).
- Une **paillasse** : générateur de fonctions, sortie de compensation de l'appareil, pont de diodes (avec filtrage), NE555, charge/décharge d'un condensateur, filtre RC (déphasage), bouton poussoir avec rebonds, alimentation continue.
- **20 TP** pensés pour l'examen : sonde, réglages, mesures, curseurs, déphasage…
- Une **partie pédagogique** dans chaque TP : *À savoir* (la notion expliquée avant de s'en servir), *Pas à pas* touche par touche **pour l'appareil choisi** avec un bouton **👆 Montre-moi** (la commande clignote sur la face avant) et *Un coup de pouce*. Un mini-cours **« Les bases de l'oscilloscope »** précède le TP 1.

## Lancer
Ouvrir `dist/oscillolab.html` (fichier unique, fonctionne sans réseau) **ou** `index.html` (sources). Menu du haut : choix de l'appareil. À droite : liste des TP, **Mode libre** et branchements.

> Molette de souris ou glisser sur un bouton = tourner ; **un clic** = appui (par exemple : appui sur POSITION = remise à zéro, appui sur LEVEL = 50 %).

## Les TP
| N° | TP | Niveau | Ce que l'élève apprend |
|---|---|---|---|
| 1 | Prise en main : signal de compensation | débutant | brancher, réglage Probe, **Autoset**, lire Upp / T / f |
| 2 | Compenser la sonde | indispensable | pics (sur-compensée) et fronts arrondis (sous-compensée), réglage de la vis sur chaque voie |
| 3 | Le piège ×1 / ×10 | indispensable | interrupteur de sonde ≠ menu Probe : tensions fausses d'un facteur 10 |
| 4 | Lire un signal sur la grille | débutant | V/div, s/div, carreaux, Upp, T, f sans les mesures automatiques |
| 5 | Couplage DC, AC et GND | intermédiaire | trouver le zéro, supprimer la composante continue, mesurer une ondulation |
| 6 | Le déclenchement | intermédiaire | niveau, pente, modes Auto / Normal, attente de déclenchement |
| 7 | Les mesures automatiques | intermédiaire | fréquence, rapport cyclique, Upp ; valeur moyenne et efficace d'un signal rectangulaire |
| 8 | Mesurer avec les curseurs | intermédiaire | ΔU, ΔT, 1/ΔT |
| 9 | Signal d'un NE555 | intermédiaire | f et α mesurés, comparés au calcul $T_H = 0{,}693 (R_1+R_2) C$ |
| 10 | Redressement : pont de diodes | avancé | Umax du secondaire, chute de 2 diodes, 100 Hz, ondulation en couplage AC |
| 11 | Charge d'un condensateur : τ | avancé | règle des 63 %, 5 τ, τ = R·C |
| 12 | Mesurer un déphasage | examen | compensation, deux voies, Δt, φ = 360° Δt / T, avance / retard |
| 13 | Mode XY : l'ellipse | examen | φ avec sin φ = Y₀ / Ymax |
| 14 | Capture unique : rebonds d'un bouton | avancé | mode Single, point de déclenchement, durée des rebonds, anti-rebond |
| 15 | Réduire le bruit : la moyenne | avancé | sonde ×1, petite sensibilité, mode Average |
| 16 | La pince de masse oubliée | débutant | reconnaître un parasite de 50 Hz |
| 17 | Le bruit : le reconnaître et l'atténuer | avancé | limite 20 MHz, rejet HF du déclenchement, moyennage / High Res, sensibilité |
| 18 | Décoder une liaison série UART / RS-232 *(RIGOL)* | avancé | vitesse, seuil, polarité, ASCII / Hex, table d'événements |
| 19 | Décoder un bus I²C *(RIGOL)* | avancé | Start, adresse 7 bits, R/W, données, ACK / NACK |
| 20 | Décoder un bus SPI *(RIGOL)* | avancé | CS, SCLK, MOSI / MISO, front d'échantillonnage, MSB / LSB |

Chaque TP : objectif, étapes, **cases cochées automatiquement** quand l'appareil est réglé comme il faut, **questions corrigées** (numériques avec tolérance, QCM). « ↻ Nouveau signal » tire d'autres valeurs. La progression est mémorisée dans le navigateur.

Les consignes sont données pour **les deux appareils** (pastilles OWON / RIGOL) : les touches et menus diffèrent.

## Fidélité aux appareils
Voir [`docs/fidelite.md`](docs/fidelite.md) pour le détail. En bref :

- **Faces avant** dessinées d'après les photos de référence (`docs/ref/`, dont la photo du DS1054Z réel) : disposition des touches, couleurs, boutons, entrées BNC, sortie de compensation.
- **Écrans** reproduits d'après les captures des appareils (bandeau d'état, marqueurs de zéro et de déclenchement, lectures V/div et s/div, menus H1–H5 / F1–F5 pour l'OWON ; menu à six touches, barre des voies, mesures rapides pour le RIGOL).
- **Comportements simulés** : chaîne verticale (sonde ×1 / ×10 et **compensation réaliste**, bande passante, couplage DC / AC / GND, limite 20 MHz, inversion, CAN 8 bits, bruit), déclenchement sur front (source, pente, niveau, couplage, temps mort, Auto / Normal / Single, Force, 50 %), **profondeur mémoire et cadence d'échantillonnage** (repliement sur l'OWON aux bases de temps lentes), détection de crêtes, moyennage, mode Roll, XY, curseurs, mesures automatiques (Max, Min, Upp, Vtop, Vbase, Vamp, moyenne, efficace, **sur un nombre entier de périodes ou sur tout l'écran**, dépassement, fréquence, période, montée, descente, largeurs, rapports cycliques, retard et phase entre voies), Autoset (refus sous 20 Hz ou 5 mV).
- **Pièges réels reproduits** : sonde non compensée, menu Probe ≠ interrupteur, pince de masse oubliée (ronflement 50 Hz), niveau de déclenchement hors du signal, couplage DC qui cache une ondulation, mesure de moyenne sur un nombre non entier de périodes.

## Développement
```
npm test                       # moteur (Node) + interface (Playwright) sur dist/
node tests/engine.test.js      # moteur seul : compensation, piège ×10, Autoset, déclenchement, NE555, pont, déphasage, Single, peak detect
node tools/build.js            # génère dist/oscillolab.html
node tests/ui.test.js          # ouvre les 20 TP sur les 2 appareils, résout le TP 1 comme un élève, captures
```
Arborescence : `js/signals.js` (sources) · `js/scope.js` (moteur) · `js/measure.js` · `js/autoset.js` · `js/profiles.js` (caractéristiques des deux appareils) · `js/ui_owon.js`, `js/ui_rigol.js` (faces avant et écrans) · `js/bench.js` (paillasse) · `js/tp.js` + `js/tps_a.js`, `js/tps_b.js` (TP) · `js/app.js`.

## Limites connues (à valider avec les appareils)
Les menus du RIGOL suivent le **manuel officiel DS1000Z** (listes de mesures, mémoire, déclenchement, boutons) et la photo de votre DS1054Z ; ceux de l'OWON suivent vos fiches, la photo et la fiche technique. Le simulateur n'ajoute **aucune fonction qui n'existe pas** sur les appareils, mais n'en simule pas encore certaines :
- **RIGOL :** déclenchements autres que Edge, RS232, I2C et SPI (menu présent, avec message), conditions de déclenchement série autres que Start / Stop / CS, décodage parallèle, base de temps retardée (appui sur SCALE horizontal), FFT et fonctions mathématiques autres que A+B, A−B, A×B, A/B, statistiques de mesure, curseurs Auto et XY, REF, enregistrement, Pass/Fail, voies logiques (absentes du DS1054Z).
- **Décodeur série du RIGOL (TP 18 à 20) :** c'est une **option logicielle (SA-DS1000Z)** sur le DS1054Z : à vérifier sur votre appareil. Menu simulé d'après le manuel DS1000Z : **MATH → Decode1 / Decode2**, décodeurs RS232, I2C, SPI, seuils réglables (0 V par défaut), format Hex / ASCII / Decimal / Binary, BusStatus, table d'événements. Il analyse **ce qui est affiché à l'écran**. L'OWON n'a pas de décodeur.
- **OWON :** entrée EXT, FFT, déclenchements Pulse / Video / Slope / Alternate, mode Scan particulier, sauvegarde de traces.
- **Ni l'un ni l'autre :** réglage de la luminosité de l'écran, langue de l'interface.

## Licence
© Yahn LE PRETTRE, Enseignant à la MFR de Pontonx.
Contenus et code : **[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr)** — partage et adaptation autorisés avec mention de l'auteur, sans usage commercial, et sous la même licence (voir [`LICENSE.md`](LICENSE.md)).

OWON et RIGOL sont des marques de leurs propriétaires respectifs ; ce simulateur est un outil pédagogique indépendant, non affilié à ces fabricants.
