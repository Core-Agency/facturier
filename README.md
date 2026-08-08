<div align="center">

<img src="img/core-mark-192.png" width="72" height="72" alt="Marque de Core">

# Facturier

**Un outil [Core](https://core-agency.be)**

**Factures et devis, sans compte, sans serveur, sans dépendance.**

Un fichier HTML, une feuille de style, un script. Ouvrez-le, remplissez,
imprimez en PDF. Vos données ne quittent jamais votre navigateur.

[![Essayer](https://img.shields.io/badge/Essayer%20maintenant-6355E0?style=for-the-badge&logoColor=white)](https://core-agency.github.io/facturier/)

![Licence](https://img.shields.io/badge/licence-MIT-1A1A1A?style=for-the-badge&labelColor=1A1A1A)
![Dépendances](https://img.shields.io/badge/dépendances-aucune-1A1A1A?style=for-the-badge&labelColor=1A1A1A)
![Hors ligne](https://img.shields.io/badge/fonctionne%20hors%20ligne-oui-1A1A1A?style=for-the-badge&labelColor=1A1A1A)

**[core-agency.github.io/facturier](https://core-agency.github.io/facturier/)**

</div>

---

## Pourquoi

Les générateurs de factures en ligne demandent un compte, hébergent vos
données chez eux, et facturent l'export PDF. Pour un indépendant qui édite
trois factures par mois, c'est disproportionné.

Celui-ci tient en trois fichiers. Il n'envoie **aucune requête réseau** — ni
police distante, ni bibliothèque, ni mesure d'audience. Ouvrez la page en
mode avion, elle fonctionne. C'est vérifiable : l'onglet « Réseau » des
outils de développement reste vide.

## Ce qu'il fait

- Factures, devis et notes de crédit
- Lignes de prestation avec quantité, prix unitaire et taux de TVA
- **TVA belge** : 21 %, 12 %, 6 %, 0 %, groupée par taux dans les totaux
- **Régime de la franchise** : bascule tous les taux à 0 % et ajoute la
  mention « TVA non applicable, art. 56*bis* du Code de la TVA »
- Remise globale, en pourcentage ou en montant, répartie au prorata
- Acompte déjà versé, déduit du total à payer
- Aperçu A4 en direct, au millimètre près
- Export PDF par l'impression du navigateur — aucune bibliothèque
- Sauvegarde automatique dans le navigateur
- Export et import du document en JSON, pour l'archiver ou le reprendre

## Utiliser

Téléchargez le dossier et ouvrez `index.html`. C'est tout.

Pour le mettre en ligne, n'importe quel hébergement statique fait l'affaire
(GitHub Pages, Cloudflare Pages, Netlify) : il n'y a rien à compiler.

## Le PDF

Le bouton **Imprimer / PDF** ouvre la boîte d'impression du navigateur.
Choisissez « Enregistrer au format PDF » comme destination.

Deux réglages à vérifier la première fois :

- **Marges : aucune.** Les marges du document sont déjà dans la feuille de
  style. Celles du navigateur s'y ajouteraient et décaleraient tout vers
  l'intérieur.
- **Graphiques d'arrière-plan : activés**, sinon le bandeau de la franchise
  TVA sort en blanc sur blanc.

## Notes techniques

**Les montants sont des entiers en centimes.** Jamais de nombre à virgule sur
de l'argent : en binaire, `0.1 + 0.2` vaut `0.30000000000000004`. Sur une
facture de vingt lignes, l'écart devient visible. La conversion se fait à la
saisie, les calculs restent en centimes, et la virgule ne réapparaît qu'à
l'affichage.

**La remise se répartit au prorata sur les lignes.** Appliquer une remise au
total puis calculer la TVA sur la base non remisée donne un total faux. Chaque
ligne reçoit sa part, et le reliquat d'arrondi va sur la dernière pour que la
somme des bases retombe exactement sur le total hors TVA.

**Les descriptions sont insérées par `textContent`.** Une description
contenant `<script>` doit s'afficher telle quelle, pas s'exécuter.

**La feuille est dimensionnée en millimètres.** À l'écran comme sur le
papier, c'est le même document : 210 × 297 mm, marges de 16 mm.

## Ce qu'il ne fait pas

Pas de suivi des paiements, pas de clients enregistrés, pas de numérotation
automatique par exercice, pas de comptabilité. C'est un outil de mise en page,
pas un logiciel de gestion.

**Ce n'est pas un conseil fiscal.** Les mentions légales et les taux proposés
correspondent au régime belge courant, mais vérifiez ce qui s'applique à votre
situation — c'est votre facture qui engage, pas cet outil.

## Structure

```
index.html          la page et le formulaire
css/facturier.css   l'atelier sombre, la feuille blanche, l'impression
js/facturier.js     calcul, rendu, sauvegarde, import/export
```

## Contribuer

Les propositions sont bienvenues, en particulier : d'autres régimes de TVA
nationaux, des traductions, et l'accessibilité au clavier.

Le projet n'a volontairement ni gestionnaire de paquets, ni étape de
compilation. Une contribution qui ajouterait une dépendance devra expliquer ce
qu'elle apporte que trois fichiers ne peuvent pas.

## Licence

MIT — voir [LICENSE](LICENSE). Faites-en ce que vous voulez.

---

<div align="center">

Construit par [Core](https://core-agency.be), agence digitale à Charleroi.

</div>
