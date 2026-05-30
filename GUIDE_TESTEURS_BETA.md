# Guide testeurs — Beta Vekio

## À envoyer aux testeurs (texte WhatsApp/SMS à copier)

---

Salut ! Merci de tester **Vekio**, mon app de suivi nutrition 🥗

**1. Installe Expo Go** (l'app qui fait tourner Vekio) :
- iPhone : https://apps.apple.com/app/expo-go/id982107779
- Android : https://play.google.com/store/apps/details?id=host.exp.exponent

**2. Ouvre Vekio :**
- **iPhone** : ouvre l'app **Appareil photo**, vise le QR code que je t'ai envoyé, puis touche la notification qui apparaît → ça ouvre Expo Go.
- **Android** : ouvre **Expo Go**, touche **"Scan QR code"** et vise le QR.

(Si ça demande un compte Expo, tu peux passer/ignorer, pas besoin.)

**3. Crée-toi un compte dans Vekio** et utilise l'app normalement quelques jours.

**Ce que tu peux tester en priorité :**
- L'inscription + le questionnaire de départ (objectif, poids, etc.)
- Ajouter des aliments à ton journal (recherche + scan code-barres)
- Le tableau de bord (calories, macros, hydratation)
- La pesée hebdomadaire
- *(pour l'amie qui teste le cycle féminin : activer le cycle dans Profil)*

**Pour me remonter un bug ou une remarque :** écris-moi directement (WhatsApp / mail). Dis-moi ce que tu faisais, ce qui s'est passé, et une capture d'écran si possible 🙏

Merci beaucoup 💚

---

## Notes techniques (pour moi, pas pour les testeurs)

- **QR actuel** : `expo-qr-beta.png` (à la racine de `vekio/`)
- **Deep link encodé** : `exp://u.expo.dev/e8e6e27d-2d41-4bc3-889c-a3e8d3195cc2/group/<UPDATE_GROUP_ID>`
- **Limitation** : le `group ID` change à CHAQUE `eas update`. Donc après chaque
  nouvelle publication, il faut **régénérer le QR** avec le nouveau group ID
  (sinon les testeurs restent sur l'ancienne version).
- **Republier une mise à jour** :
  ```
  eas update --branch preview --message "Description du changement" --platform all
  ```
  Puis régénérer le QR avec le nouveau `Update group ID` affiché.
- **Prérequis testeur** : Expo Go récent (compatible SDK 54). Runtime publié = `exposdk:54.0.0`.
- **Dashboard** : https://expo.dev/accounts/amlvisuals/projects/vekio/updates
