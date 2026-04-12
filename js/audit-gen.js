/**
 * AuditFlow SaaS - audit-gen.js (version simplifiée)
 * Génère automatiquement les processus et le plan d'audit à partir des réponses du wizard
 */

async function generateAuditUniverse(answers, organization_id) {
  if (!organization_id) {
    toast("Erreur : organization_id manquant", "error");
    return;
  }

  console.log("[AuditGen] Début de la génération pour", organization_id);
  toast("Génération de votre univers d'audit en cours...", "info");

  try {
    // 1. Sauvegarder les réponses du wizard (optionnel mais utile)
    await saveWizardAnswers(answers, organization_id);

    // 2. Activer / créer les processus selon les activités sélectionnées
    const newProcesses = await activateProcesses(answers, organization_id);

    // 3. Créer un plan d'audit initial
    const planId = await createInitialAuditPlan(answers, organization_id);

    // 4. Créer les missions de base dans le plan
    await createInitialMissions(newProcesses, planId, organization_id);

    console.log("[AuditGen] Génération terminée avec succès");
    toast("Univers d'audit et plan générés avec succès !", "success");

    // Marquer l'organisation comme configurée
    await markOrgAsConfigured(organization_id);

  } catch (error) {
    console.error("[AuditGen] Erreur :", error);
    toast("Erreur pendant la génération : " + error.message, "error");
  }
}

// =============================================
// Fonctions internes
// =============================================

async function saveWizardAnswers(answers, organization_id) {
  const payload = {
    organization_id: organization_id,
    wizard_answers: answers,
    configured_at: new Date().toISOString()
  };

  const { error } = await getSB()
    .from('af_org_config')
    .upsert(payload, { onConflict: 'organization_id' });

  if (error) console.warn("Impossible de sauvegarder les réponses wizard :", error.message);
}

async function activateProcesses(answers, organization_id) {
  const processesToAdd = [];

  // Processus de base (toujours présents)
  processesToAdd.push(
    { code: "FIN-001", label: "Clôture comptable et reporting", domain: "Finance", base_risk: 4 },
    { code: "ACH-001", label: "Achats et fournisseurs", domain: "Achats", base_risk: 3 },
    { code: "GOV-001", label: "Gouvernance et contrôle interne", domain: "Gouvernance", base_risk: 3 }
  );

  // Processus selon les activités sélectionnées
  if (answers.selected_activities.includes("fabrication")) {
    processesToAdd.push(
      { code: "PROD-001", label: "Contrôle qualité et production", domain: "Opérations", base_risk: 4 },
      { code: "QHSE-001", label: "Hygiène, Sécurité, Environnement", domain: "Opérations", base_risk: 4 }
    );
  }

  if (answers.selected_activities.includes("stocks") || answers.selected_activities.includes("magasins")) {
    processesToAdd.push(
      { code: "STK-001", label: "Gestion et valorisation des stocks", domain: "Opérations", base_risk: 4 }
    );
  }

  if (answers.selected_activities.includes("transport")) {
    processesToAdd.push(
      { code: "LOG-001", label: "Transport et logistique", domain: "Opérations", base_risk: 3 }
    );
  }

  if (answers.selected_activities.includes("achats_int")) {
    processesToAdd.push(
      { code: "INT-001", label: "Achats internationaux et douanes", domain: "Achats", base_risk: 5 }
    );
  }

  // Insertion dans af_processes
  const rows = processesToAdd.map(p => ({
    organization_id: organization_id,
    code: p.code,
    label: p.label,
    domain: p.domain,
    base_risk: p.base_risk,
    status: 'actif',
    is_generated: true
  }));

  const { error } = await getSB()
    .from('af_processes')
    .upsert(rows, { onConflict: 'organization_id,code' });

  if (error) throw new Error("Erreur lors de l'ajout des processus : " + error.message);

  return processesToAdd;
}

async function createInitialAuditPlan(answers, organization_id) {
  const currentYear = new Date().getFullYear();

  const plan = {
    organization_id: organization_id,
    titre: `Plan d'audit initial ${currentYear} - Généré par le wizard`,
    annee: currentYear,
    type: 'pluriannuel',
    statut: 'Planifié',
    is_generated: true,
    notes: `Plan généré automatiquement le ${new Date().toLocaleDateString('fr-FR')}`
  };

  const { data, error } = await getSB()
    .from('af_audit_plan')
    .insert(plan)
    .select('id')
    .single();

  if (error) throw new Error("Erreur création plan d'audit : " + error.message);

  return data.id;
}

async function createInitialMissions(processes, planId, organization_id) {
  // Pour l'instant on crée juste une mission par processus (simplifié)
  const missions = processes.map((p, index) => ({
    organization_id: organization_id,
    plan_id: planId,                    // si tu as une colonne plan_id, sinon ignore
    titre: p.label,
    type: 'Process',
    domaine: p.domain,
    statut: 'Planifié',
    annee: new Date().getFullYear(),
    is_generated: true
  }));

  const { error } = await getSB()
    .from('af_audit_plan')   // On peut améliorer plus tard avec une vraie table missions
    .upsert(missions);       // Pour l'instant on réutilise af_audit_plan

  if (error) console.warn("Erreur création missions initiales :", error.message);
}

async function markOrgAsConfigured(organization_id) {
  await getSB()
    .from('organizations')
    .update({ is_configured: true, configured_at: new Date().toISOString() })
    .eq('id', organization_id);
}

// Rendre la fonction accessible globalement
window.generateAuditUniverse = generateAuditUniverse;
