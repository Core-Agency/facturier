/* ==========================================================================
   FACTURIER
   --------------------------------------------------------------------------
   Aucune dépendance, aucune requête réseau. Tout vit dans la page et dans
   le `localStorage` du navigateur.

   ⚠️ TOUS LES MONTANTS SONT DES ENTIERS EN CENTIMES.
   Jamais de nombre à virgule sur de l'argent : 0,1 + 0,2 vaut
   0,30000000000000004 en binaire, et sur une facture de vingt lignes
   l'écart devient visible. On convertit à la saisie, on calcule en
   centimes, on ne remet une virgule qu'à l'affichage.
   ========================================================================== */

(function () {
  'use strict';

  const CLE = 'facturier.document.v1';
  const TAUX_TVA = [21, 12, 6, 0];

  const $ = (sel) => document.querySelector(sel);

  /* --------------------------------------------------------------------
     ARGENT
     -------------------------------------------------------------------- */

  /** "12,50" ou "12.5" -> 1250 centimes. Tout ce qui n'est pas un nombre
      vaut zéro : une facture ne doit jamais afficher « NaN ». */
  function enCentimes(valeur) {
    const n = parseFloat(String(valeur ?? '').replace(',', '.'));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  }

  function formater(centimes, devise) {
    return new Intl.NumberFormat('fr-BE', {
      style: 'currency',
      currency: devise || 'EUR',
    }).format(centimes / 100);
  }

  function formaterDate(iso) {
    if (!iso) return '';
    const [a, m, j] = iso.split('-');
    return `${j}/${m}/${a}`;
  }

  /* --------------------------------------------------------------------
     L'ETAT
     -------------------------------------------------------------------- */

  const champs = [
    'type', 'numero', 'devise', 'dateEmission', 'dateEcheance',
    'emNom', 'emAdresse', 'emTva', 'emIban', 'emMail', 'emTel',
    'clNom', 'clAdresse', 'clTva',
    'remise', 'remiseType', 'acompte', 'mentions', 'pied',
  ];

  function lireEtat() {
    const etat = {};
    champs.forEach((c) => { etat[c] = $('#' + c).value; });
    etat.franchise = $('#franchise').checked;
    etat.lignes = [...document.querySelectorAll('.ligne')].map((el) => ({
      desc: el.querySelector('[data-r="desc"]').value,
      qte: el.querySelector('[data-r="qte"]').value,
      pu: el.querySelector('[data-r="pu"]').value,
      tva: el.querySelector('[data-r="tva"]').value,
    }));
    return etat;
  }

  function ecrireEtat(etat) {
    champs.forEach((c) => {
      if (etat[c] !== undefined) $('#' + c).value = etat[c];
    });
    $('#franchise').checked = !!etat.franchise;
    $('#lignes').innerHTML = '';
    (etat.lignes && etat.lignes.length ? etat.lignes : [{}]).forEach(ajouterLigne);
  }

  /* --------------------------------------------------------------------
     LES LIGNES
     -------------------------------------------------------------------- */

  function ajouterLigne(donnees) {
    const d = donnees || {};
    const el = document.createElement('div');
    el.className = 'ligne';
    el.innerHTML = `
      <input class="champ__saisie" data-r="desc" type="text"
             placeholder="Description de la prestation" value="">
      <div class="ligne__chiffres">
        <input class="champ__saisie" data-r="qte" type="number" step="0.01" min="0" placeholder="Qté">
        <input class="champ__saisie" data-r="pu" type="number" step="0.01" min="0" placeholder="Prix unitaire">
        <select class="champ__saisie" data-r="tva">
          ${TAUX_TVA.map((t) => `<option value="${t}">TVA ${t} %</option>`).join('')}
        </select>
        <button class="ligne__jeter" type="button" title="Supprimer cette ligne" aria-label="Supprimer cette ligne">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5 5 13h6l.5-8.5"
                  stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>`;

    /* Les valeurs sont posées par propriété et non dans le gabarit :
       un guillemet tapé dans une description casserait l'attribut HTML. */
    el.querySelector('[data-r="desc"]').value = d.desc || '';
    el.querySelector('[data-r="qte"]').value = d.qte ?? '1';
    el.querySelector('[data-r="pu"]').value = d.pu ?? '';
    el.querySelector('[data-r="tva"]').value = d.tva ?? '21';

    el.querySelector('.ligne__jeter').addEventListener('click', () => {
      el.remove();
      if (!document.querySelector('.ligne')) ajouterLigne();
      rafraichir();
    });

    $('#lignes').appendChild(el);
  }

  /* --------------------------------------------------------------------
     LE CALCUL
     -------------------------------------------------------------------- */

  function calculer(etat) {
    const franchise = etat.franchise;

    const lignes = etat.lignes.map((l) => {
      const qte = parseFloat(String(l.qte).replace(',', '.')) || 0;
      const pu = enCentimes(l.pu);
      const taux = franchise ? 0 : (parseInt(l.tva, 10) || 0);
      return { desc: l.desc, qte, pu, taux, total: Math.round(qte * pu) };
    });

    const brut = lignes.reduce((s, l) => s + l.total, 0);

    /* La remise s'applique au total hors taxes, puis se REPARTIT sur les
       lignes au prorata. Sans cette répartition, la TVA serait calculée
       sur une base non remisée et le total ne tomberait pas juste. */
    let remise = etat.remiseType === 'pct'
      ? Math.round(brut * (parseFloat(String(etat.remise).replace(',', '.')) || 0) / 100)
      : enCentimes(etat.remise);
    if (remise > brut) remise = brut;

    const htva = brut - remise;

    /* TVA groupée par taux. On calcule la base remisée de chaque ligne,
       et le reliquat d'arrondi va sur la dernière ligne du groupe pour
       que la somme des bases retombe exactement sur `htva`. */
    const parTaux = new Map();
    let baseCumulee = 0;
    lignes.forEach((l, i) => {
      let base = brut > 0 ? Math.round(l.total * htva / brut) : 0;
      if (i === lignes.length - 1) base = htva - baseCumulee;
      baseCumulee += base;
      const e = parTaux.get(l.taux) || { base: 0, tva: 0 };
      e.base += base;
      parTaux.set(l.taux, e);
    });
    parTaux.forEach((e, taux) => { e.tva = Math.round(e.base * taux / 100); });

    const tva = [...parTaux.values()].reduce((s, e) => s + e.tva, 0);
    const ttc = htva + tva;
    const acompte = Math.min(enCentimes(etat.acompte), ttc);

    return { lignes, brut, remise, htva, parTaux, tva, ttc, acompte, du: ttc - acompte };
  }

  /* --------------------------------------------------------------------
     LE RENDU
     -------------------------------------------------------------------- */

  function rendre(etat, c) {
    const dev = etat.devise;
    const txt = (id, valeur) => { $(id).textContent = valeur || ''; };

    txt('#vType', etat.type || 'Facture');
    txt('#vNumero', etat.numero ? 'N° ' + etat.numero : '');
    txt('#vEmission', formaterDate(etat.dateEmission) || '—');

    /* Un devis n'a pas d'échéance de paiement : la ligne disparaît plutôt
       que d'afficher un tiret qui n'aurait pas de sens. */
    const montrerEcheance = etat.type !== 'Devis' && etat.dateEcheance;
    $('#vEcheanceLigne').hidden = !montrerEcheance;
    txt('#vEcheance', formaterDate(etat.dateEcheance));

    txt('#vEmNom', etat.emNom || '—');
    txt('#vEmAdresse', etat.emAdresse);
    txt('#vEmTva', etat.emTva ? 'TVA ' + etat.emTva : '');
    txt('#vEmContact', [etat.emMail, etat.emTel].filter(Boolean).join(' · '));

    txt('#vClNom', etat.clNom || '—');
    txt('#vClAdresse', etat.clAdresse);
    txt('#vClTva', etat.clTva ? 'TVA ' + etat.clTva : '');

    /* Les lignes : on construit par `textContent` et non par `innerHTML`.
       Une description contenant « <script> » doit s'afficher tel quel,
       pas s'exécuter. */
    const corps = $('#vLignes');
    corps.innerHTML = '';
    c.lignes.filter((l) => l.desc || l.total).forEach((l) => {
      const tr = document.createElement('tr');
      const cellules = [
        { txt: l.desc, cls: 'ligne__desc' },
        { txt: String(l.qte), cls: 'col-num' },
        { txt: formater(l.pu, dev), cls: 'col-num' },
        { txt: l.taux + ' %', cls: 'col-num' },
        { txt: formater(l.total, dev), cls: 'col-num' },
      ];
      cellules.forEach((cel) => {
        const td = document.createElement('td');
        td.className = cel.cls;
        td.textContent = cel.txt;
        tr.appendChild(td);
      });
      corps.appendChild(tr);
    });

    /* Les totaux */
    const dl = $('#vTotaux');
    dl.innerHTML = '';
    const ajouter = (terme, valeur) => {
      const dt = document.createElement('dt');
      dt.textContent = terme;
      const dd = document.createElement('dd');
      dd.textContent = valeur;
      dl.append(dt, dd);
    };

    if (c.remise > 0) {
      ajouter('Sous-total', formater(c.brut, dev));
      ajouter('Remise', '− ' + formater(c.remise, dev));
    }
    ajouter('Total hors TVA', formater(c.htva, dev));
    [...c.parTaux.entries()]
      .filter(([, e]) => e.base > 0)
      .sort((a, b) => b[0] - a[0])
      .forEach(([taux, e]) => {
        if (taux > 0) ajouter(`TVA ${taux} %`, formater(e.tva, dev));
      });
    if (c.acompte > 0) ajouter('Acompte versé', '− ' + formater(c.acompte, dev));

    txt('#vDu', formater(c.du, dev));
    txt('#vMentions', etat.mentions);
    txt('#vPied', etat.pied);
    $('#vFranchise').hidden = !etat.franchise;
    txt('#vIban', etat.emIban ? 'IBAN ' + etat.emIban : '');
  }

  /* --------------------------------------------------------------------
     PERSISTANCE
     -------------------------------------------------------------------- */

  function sauver(etat) {
    try {
      localStorage.setItem(CLE, JSON.stringify(etat));
    } catch (e) {
      /* Mode privé, quota plein : l'outil doit continuer à fonctionner.
         On perd la sauvegarde, pas le document en cours. */
      $('#etat').textContent = 'Sauvegarde impossible dans ce navigateur.';
    }
  }

  function charger() {
    try {
      const brut = localStorage.getItem(CLE);
      return brut ? JSON.parse(brut) : null;
    } catch (e) { return null; }
  }

  /* --------------------------------------------------------------------
     BOUCLE
     -------------------------------------------------------------------- */

  let minuteur = null;

  function rafraichir() {
    const etat = lireEtat();
    rendre(etat, calculer(etat));
    clearTimeout(minuteur);
    minuteur = setTimeout(() => sauver(etat), 400);
  }

  /* --------------------------------------------------------------------
     DEMARRAGE
     -------------------------------------------------------------------- */

  function valeursParDefaut() {
    const aujourdhui = new Date();
    const dans30 = new Date(aujourdhui.getTime() + 30 * 864e5);
    const iso = (d) => d.toISOString().slice(0, 10);
    return {
      type: 'Facture',
      numero: `${aujourdhui.getFullYear()}-001`,
      devise: 'EUR',
      dateEmission: iso(aujourdhui),
      dateEcheance: iso(dans30),
      remise: '0',
      remiseType: 'pct',
      acompte: '0',
      mentions: 'Paiement à 30 jours de date de facture.',
      pied: 'Merci de votre confiance.',
      lignes: [{ desc: '', qte: '1', pu: '', tva: '21' }],
    };
  }

  ecrireEtat(charger() || valeursParDefaut());
  rafraichir();

  document.addEventListener('input', rafraichir);
  document.addEventListener('change', rafraichir);

  $('#ajouter').addEventListener('click', () => { ajouterLigne(); rafraichir(); });
  $('#imprimer').addEventListener('click', () => window.print());

  $('#vider').addEventListener('click', () => {
    if (!confirm('Vider le document et repartir de zéro ?')) return;
    try { localStorage.removeItem(CLE); } catch (e) { /* sans importance */ }
    ecrireEtat(valeursParDefaut());
    rafraichir();
  });

  $('#exporter').addEventListener('click', () => {
    const etat = lireEtat();
    const blob = new Blob([JSON.stringify(etat, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${etat.type || 'document'}-${etat.numero || 'sans-numero'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $('#importer').addEventListener('click', () => $('#fichier').click());

  $('#fichier').addEventListener('change', (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      try {
        ecrireEtat(JSON.parse(lecteur.result));
        rafraichir();
        $('#etat').textContent = 'Document importé.';
      } catch (e) {
        $('#etat').textContent = 'Ce fichier n\'est pas un document Facturier.';
      }
    };
    lecteur.readAsText(f);
    ev.target.value = '';
  });
})();
