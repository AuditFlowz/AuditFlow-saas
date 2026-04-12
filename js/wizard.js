/**
 * AuditFlow SaaS - wizard.js (version simplifiée)
 * Questionnaire de configuration intelligent
 */

let wizardAnswers = {
  org_name: "",
  geo_full_coverage: null,      // true = totale, false = partielle
  countries_in: [],
  process_full_coverage: null,
  selected_activities: []       // stocks, magasins, fabrication, transport, etc.
};

let currentWizardStep = 1;

function initWizard() {
  const vc = document.getElementById('vc');
  if (!vc) return;

  vc.innerHTML = `
    <div class="content">
      <div class="card" style="max-width:820px; margin:40px auto; padding:2rem;">
        <h2 style="text-align:center; margin-bottom:8px;">Configuration initiale</h2>
        <p style="text-align:center; color:#666; margin-bottom:2rem;">
          Répondez à ces questions pour qu'AuditFlow génère automatiquement votre univers d'audit et votre plan.
        </p>
        
        <div id="wizard-step-content"></div>

        <div style="margin-top:2.5rem; display:flex; justify-content:space-between; align-items:center;">
          <button class="bs" id="wz-prev" style="min-width:120px;">← Précédent</button>
          <div id="wz-step-info" style="font-size:13px; color:#666;"></div>
          <button class="bp" id="wz-next" style="min-width:140px;">Suivant →</button>
        </div>
      </div>
    </div>
  `;

  renderCurrentStep();
  attachWizardListeners();
}

function renderCurrentStep() {
  const content = document.getElementById('wizard-step-content');
  const info = document.getElementById('wz-step-info');

  if (currentWizardStep === 1) {
    content.innerHTML = `
      <div style="margin-bottom:1.5rem">
        <label style="font-weight:500; display:block; margin-bottom:6px;">Nom de l'organisation</label>
        <input type="text" id="wz-orgname" class="f-inp" style="width:100%" placeholder="ex : Groupe 74SW" value="${wizardAnswers.org_name}">
      </div>

      <div>
        <label style="font-weight:500; display:block; margin-bottom:8px;">Couvrez-vous l'ensemble du groupe géographiquement ?</label>
        <div style="display:flex; gap:20px;">
          <label><input type="radio" name="geo" value="true" ${wizardAnswers.geo_full_coverage === true ? 'checked' : ''}> Oui – Couverture totale</label>
          <label><input type="radio" name="geo" value="false" ${wizardAnswers.geo_full_coverage === false ? 'checked' : ''}> Non – Périmètre partiel</label>
        </div>
      </div>
    `;
    info.textContent = `Étape 1 sur 3`;
  } 
  else if (currentWizardStep === 2) {
    content.innerHTML = `
      <label style="font-weight:500; display:block; margin-bottom:12px;">Quelles activités opérationnelles avez-vous ?</label>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:12px;">
        <label class="wz-check"><input type="checkbox" value="stocks" ${wizardAnswers.selected_activities.includes('stocks')?'checked':''}> Stocks / Entrepôts</label>
        <label class="wz-check"><input type="checkbox" value="magasins" ${wizardAnswers.selected_activities.includes('magasins')?'checked':''}> Magasins physiques / Retail</label>
        <label class="wz-check"><input type="checkbox" value="fabrication" ${wizardAnswers.selected_activities.includes('fabrication')?'checked':''}> Fabrication / Production</label>
        <label class="wz-check"><input type="checkbox" value="transport" ${wizardAnswers.selected_activities.includes('transport')?'checked':''}> Transport / Logistique</label>
        <label class="wz-check"><input type="checkbox" value="achats_int" ${wizardAnswers.selected_activities.includes('achats_int')?'checked':''}> Achats internationaux</label>
        <label class="wz-check"><input type="checkbox" value="it" ${wizardAnswers.selected_activities.includes('it')?'checked':''}> Systèmes d'information critiques</label>
      </div>
    `;
    info.textContent = `Étape 2 sur 3`;
  } 
  else if (currentWizardStep === 3) {
    content.innerHTML = `
      <h3 style="margin-bottom:1rem;">Récapitulatif</h3>
      <div class="card" style="background:#f9f9f7; padding:1.5rem;">
        <strong>Organisation :</strong> ${wizardAnswers.org_name || '(non renseigné)'}<br><br>
        <strong>Couverture géographique :</strong> ${wizardAnswers.geo_full_coverage === true ? 'Totale' : 'Partielle'}<br>
        <strong>Activités sélectionnées :</strong> ${wizardAnswers.selected_activities.length ? wizardAnswers.selected_activities.join(', ') : 'Aucune'}<br><br>
        <strong>Action :</strong> AuditFlow va maintenant générer automatiquement vos processus et votre plan d'audit initial.
      </div>
    `;
    info.textContent = `Étape 3 sur 3 — Prêt à générer`;
    document.getElementById('wz-next').textContent = '🚀 Générer mon plan d\'audit';
  }
}

function attachWizardListeners() {
  // Boutons précédent / suivant
  document.getElementById('wz-next').onclick = handleNext;
  document.getElementById('wz-prev').onclick = () => {
    if (currentWizardStep > 1) {
      currentWizardStep--;
      renderCurrentStep();
    }
  };

  // Collecte des réponses en temps réel
  document.addEventListener('change', (e) => {
    if (e.target.id === 'wz-orgname') {
      wizardAnswers.org_name = e.target.value.trim();
    }
    if (e.target.name === 'geo') {
      wizardAnswers.geo_full_coverage = e.target.value === 'true';
    }
    if (e.target.type === 'checkbox') {
      const val = e.target.value;
      if (e.target.checked) {
        if (!wizardAnswers.selected_activities.includes(val)) wizardAnswers.selected_activities.push(val);
      } else {
        wizardAnswers.selected_activities = wizardAnswers.selected_activities.filter(v => v !== val);
      }
    }
  });
}

async function handleNext() {
  if (currentWizardStep === 3) {
    // Génération finale
    document.getElementById('wz-next').disabled = true;
    document.getElementById('wz-next').textContent = 'Génération en cours...';

    try {
      await generateAuditUniverse(wizardAnswers, CU ? CU.organization_id : null);
      toast('Univers d\'audit et plan générés avec succès !', 'success');
      
      // Redirection vers le dashboard
      setTimeout(() => {
        nav('dashboard');
      }, 1500);
    } catch (err) {
      console.error(err);
      toast('Erreur lors de la génération : ' + err.message, 'error');
      document.getElementById('wz-next').disabled = false;
      document.getElementById('wz-next').textContent = '🚀 Générer mon plan d\'audit';
    }
  } else {
    currentWizardStep++;
    renderCurrentStep();
  }
}
