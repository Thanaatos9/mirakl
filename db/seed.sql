-- ============================================================
-- EUGENIA — Données de démo réalistes
-- À exécuter APRÈS schema.sql
-- ⚠️ Remplacer '<VENDOR_USER_ID>' par l'UUID du user vendeur Supabase
-- ============================================================

-- Variable pour le vendor_id (à remplacer)
-- Tip : SELECT id FROM auth.users WHERE email = 'votre@email.com';

-- ── Tickets de démo ───────────────────────────────────────────

INSERT INTO tickets (id, vendor_id, client, email, marketplace, subject, status, priority, category, assignee, order_ref, sla, raw_message, created_at) VALUES

-- RÉSOLUS PAR L'IA (cas simples)
('TK-4801', NULL, 'Alice Martin', 'alice.m@example.com', 'Fnac',
 'Où est ma commande ?', 'resolved', 'medium', 'Livraison', 'Agent IA',
 'ORD-2026-8801', 'Respecté',
 'Bonjour, j''ai commandé des écouteurs il y a 5 jours et je n''ai toujours rien reçu. Pouvez-vous me dire où en est la livraison ?',
 now() - interval '3 hours'),

('TK-4802', NULL, 'Bruno Petit', 'bruno.p@example.com', 'Darty',
 'Délai de livraison dépassé', 'resolved', 'high', 'Livraison', 'Agent IA',
 'ORD-2026-8802', 'Dépassé',
 'Ma commande de machine à café devait arriver il y a 3 jours. Le suivi Chronopost est bloqué depuis 48h. Je suis très mécontent.',
 now() - interval '5 hours'),

('TK-4803', NULL, 'Claire Dupont', 'claire.d@example.com', 'Cdiscount',
 'Demande de suivi colis', 'resolved', 'low', 'Livraison', 'Agent IA',
 'ORD-2026-8803', 'Respecté',
 'Bonjour, pourriez-vous me confirmer la date de livraison estimée pour ma commande ?',
 now() - interval '6 hours'),

('TK-4804', NULL, 'David Morel', 'david.m@example.com', 'Amazon',
 'Question sur la politique de retour', 'resolved', 'low', 'Échange', 'Agent IA',
 'ORD-2026-8804', 'Respecté',
 'Le produit ne me convient pas, quel est le délai pour faire un retour ?',
 now() - interval '4 hours'),

-- EN ATTENTE DE VALIDATION HUMAINE (cas financiers)
('TK-4805', NULL, 'Emma Caron', 'emma.c@example.com', 'Fnac',
 'Produit défectueux — remboursement', 'pending', 'high', 'Remboursement', 'Agent IA',
 'ORD-2026-8805', 'Respecté',
 'La montre GPS que j''ai reçue ne s''allume plus après 2 jours d''utilisation. Je souhaite être remboursée intégralement.',
 now() - interval '2 hours'),

('TK-4806', NULL, 'Farid Leroy', 'farid.l@example.com', 'Darty',
 'Colis perdu — demande remboursement', 'pending', 'critical', 'Remboursement', 'Agent IA',
 'ORD-2026-8806', 'Dépassé',
 'Le transporteur DHL confirme que mon colis est perdu. Ça fait 3 semaines que j''attends. Je veux mon argent.',
 now() - interval '1 hour'),

('TK-4807', NULL, 'Gaëlle Roux', 'gaelle.r@example.com', 'Cdiscount',
 'Annulation après expédition', 'pending', 'medium', 'Annulation', 'Agent IA',
 'ORD-2026-8807', 'Respecté',
 'J''ai commandé par erreur un meuble. Le colis est déjà parti. Est-il possible d''annuler et d''être remboursé ?',
 now() - interval '90 minutes'),

-- ESCALADÉS (cas complexes/ambigus)
('TK-4808', NULL, 'Hugo Simon', 'hugo.s@example.com', 'Amazon',
 'Livré mais non reçu', 'escalated', 'critical', 'Livraison', 'Agent IA',
 'ORD-2026-8808', 'Dépassé',
 'Le suivi dit "livré" mais je n''ai rien reçu. Personne n''est passé. Je soupçonne un vol de colis.',
 now() - interval '30 minutes'),

('TK-4809', NULL, 'Inès Dupont', 'ines.d@example.com', 'Fnac',
 'Demande vague — geste commercial', 'escalated', 'medium', 'Produit', 'Agent IA',
 'ORD-2026-8809', 'Respecté',
 'Je ne suis pas du tout satisfaite de mon expérience. Je veux un geste commercial sinon je laisse un avis négatif.',
 now() - interval '45 minutes'),

-- OUVERTS (non encore traités)
('TK-4810', NULL, 'Julien Robert', 'julien.r@example.com', 'Darty',
 'Produit arrivé endommagé', 'open', 'high', 'Produit', 'Agent IA',
 'ORD-2026-8810', 'Respecté',
 'Le carton était complètement écrasé à la réception. L''écran de la tablette est fissuré. Photos en pièce jointe.',
 now() - interval '10 minutes'),

('TK-4811', NULL, 'Katia Noël', 'katia.n@example.com', 'Cdiscount',
 'Retour produit dans les délais', 'open', 'medium', 'Échange', 'Agent IA',
 'ORD-2026-8811', 'Respecté',
 'Je souhaite retourner un aspirateur acheté il y a 10 jours. Il fonctionne mais ne correspond pas à mes attentes.',
 now() - interval '5 minutes'),

('TK-4812', NULL, 'Léo Fontaine', 'leo.f@example.com', 'Amazon',
 'Erreur dans la commande', 'open', 'medium', 'Produit', 'Agent IA',
 'ORD-2026-8812', 'Respecté',
 'J''ai reçu un article complètement différent de celui que j''ai commandé. Au lieu d''un clavier mécanique, j''ai reçu une souris.',
 now() - interval '2 minutes'),

('TK-4813', NULL, 'Manon Aubert', 'manon.a@example.com', 'Fnac',
 'Facturation en double', 'open', 'critical', 'Facturation', 'Agent IA',
 'ORD-2026-8813', 'Respecté',
 'J''ai été débitée deux fois pour la même commande. Le montant de 189€ apparaît en double sur mon relevé bancaire.',
 now() - interval '1 minute');

-- ── Messages de conversation ──────────────────────────────────

-- TK-4801 : résolu automatiquement
INSERT INTO messages (ticket_id, role, is_ai, text, created_at) VALUES
('TK-4801', 'client', false,
 'Bonjour, j''ai commandé des écouteurs il y a 5 jours et je n''ai toujours rien reçu. Pouvez-vous me dire où en est la livraison ?',
 now() - interval '3 hours'),
('TK-4801', 'agent', true,
 'Bonjour Alice ! J''ai vérifié votre commande ORD-2026-8801. Votre colis est actuellement en transit chez Colissimo et devrait arriver demain avant 18h. Voici le lien de suivi : https://t.colissimo.fr/TRK-8801. N''hésitez pas si vous avez d''autres questions !',
 now() - interval '3 hours' + interval '30 seconds');

-- TK-4802 : résolu avec relance transporteur
INSERT INTO messages (ticket_id, role, is_ai, text, created_at) VALUES
('TK-4802', 'client', false,
 'Ma commande de machine à café devait arriver il y a 3 jours. Le suivi Chronopost est bloqué depuis 48h.',
 now() - interval '5 hours'),
('TK-4802', 'agent', true,
 'Bonjour Bruno, je comprends votre frustration. J''ai immédiatement contacté Chronopost pour relancer votre colis (TRK-8802). Le SLA est effectivement dépassé. Je vous tiendrai informé dès que j''ai une mise à jour. En attendant, votre colis a été signalé comme prioritaire.',
 now() - interval '5 hours' + interval '45 seconds');

-- TK-4805 : en attente validation
INSERT INTO messages (ticket_id, role, is_ai, text, created_at) VALUES
('TK-4805', 'client', false,
 'La montre GPS ne s''allume plus après 2 jours. Je veux un remboursement.',
 now() - interval '2 hours'),
('TK-4805', 'agent', true,
 'Bonjour Emma, je suis désolé pour ce désagrément. J''ai analysé votre dossier et un remboursement intégral de 199,00€ est recommandé. Un bon de retour a été généré pour vous. Cette demande nécessite une validation finale de notre équipe, vous serez notifiée très rapidement.',
 now() - interval '2 hours' + interval '40 seconds');

-- TK-4808 : escaladé
INSERT INTO messages (ticket_id, role, is_ai, text, created_at) VALUES
('TK-4808', 'client', false,
 'Le suivi dit "livré" mais je n''ai rien reçu. Personne n''est passé. Je soupçonne un vol de colis.',
 now() - interval '30 minutes'),
('TK-4808', 'agent', true,
 'Bonjour Hugo, je prends votre signalement très au sérieux. Il y a une contradiction entre le statut "livré" du transporteur et votre déclaration. Ce type de situation nécessite une investigation approfondie que je transfère à notre équipe spécialisée pour un traitement prioritaire.',
 now() - interval '30 minutes' + interval '35 seconds');

-- ── Agent Actions (journal de l'IA) ──────────────────────────

INSERT INTO agent_actions (ticket_id, action, type, icon, created_at) VALUES
-- TK-4801
('TK-4801', 'Ticket classifié : Livraison — suivi colis (confiance 95%)', 'decision', '🎯', now() - interval '3 hours'),
('TK-4801', 'Vérification statut transporteur Colissimo', 'action', '🔍', now() - interval '3 hours' + interval '10 seconds'),
('TK-4801', 'Réponse automatique envoyée avec lien de suivi', 'reply', '💬', now() - interval '3 hours' + interval '30 seconds'),
('TK-4801', 'Ticket résolu automatiquement', 'resolved', '✅', now() - interval '3 hours' + interval '31 seconds'),

-- TK-4802
('TK-4802', 'Ticket classifié : Livraison — SLA dépassé (confiance 92%)', 'decision', '🎯', now() - interval '5 hours'),
('TK-4802', 'SLA dépassé détecté (+72h). Relance transporteur déclenchée.', 'action', '⚡', now() - interval '5 hours' + interval '15 seconds'),
('TK-4802', 'Client informé du retard avec actions correctives', 'reply', '💬', now() - interval '5 hours' + interval '45 seconds'),
('TK-4802', 'Ticket résolu — suivi actif', 'resolved', '✅', now() - interval '5 hours' + interval '46 seconds'),

-- TK-4805
('TK-4805', 'Ticket classifié : Produit défectueux (confiance 96%)', 'decision', '🎯', now() - interval '2 hours'),
('TK-4805', 'Bon de retour généré RET-8805', 'action', '📦', now() - interval '2 hours' + interval '12 seconds'),
('TK-4805', 'Remboursement 199,00€ recommandé → validation humaine requise', 'escalation', '🔒', now() - interval '2 hours' + interval '20 seconds'),

-- TK-4806
('TK-4806', 'Ticket classifié : Colis perdu (confiance 98%)', 'decision', '🎯', now() - interval '1 hour'),
('TK-4806', 'Perte confirmée par DHL. Remboursement 299,00€ recommandé.', 'escalation', '🔒', now() - interval '1 hour' + interval '18 seconds'),

-- TK-4808
('TK-4808', 'Ticket classifié : Livré non reçu (confiance 62%)', 'decision', '🎯', now() - interval '30 minutes'),
('TK-4808', 'Contradiction détectée : statut "livré" vs déclaration client. Confiance insuffisante.', 'escalation', '⚠️', now() - interval '30 minutes' + interval '10 seconds'),

-- TK-4809
('TK-4809', 'Ticket classifié : Intention vague (confiance 45%)', 'decision', '🎯', now() - interval '45 minutes'),
('TK-4809', 'Intention trop ambiguë pour traitement automatique. Escalade.', 'escalation', '⚠️', now() - interval '45 minutes' + interval '8 seconds');

-- ── Validations en attente ────────────────────────────────────

INSERT INTO validations (ticket_id, client, marketplace, amount, type, context, agent_quote, priority, sla, status, created_at) VALUES
('TK-4805', 'Emma Caron', 'Fnac', 199.00,
 'Remboursement intégral',
 'Montre GPS défectueuse après 2 jours. Produit sous garantie. Bon de retour RET-8805 généré.',
 'Produit clairement défectueux avec panne complète. Le client est dans son droit. Remboursement intégral recommandé.',
 'high', 'Respecté', 'pending',
 now() - interval '2 hours'),

('TK-4806', 'Farid Leroy', 'Darty', 299.00,
 'Remboursement intégral',
 'Colis perdu confirmé par DHL. Client VIP (11 commandes). Délai de 3 semaines.',
 'Perte confirmée par le transporteur. Client fidèle et VIP. Remboursement total recommandé sans attendre.',
 'critical', 'Dépassé', 'pending',
 now() - interval '1 hour'),

('TK-4807', 'Gaëlle Roux', 'Cdiscount', 320.00,
 'Remboursement sur interception',
 'Annulation après expédition. Meuble en transit chez GLS. Interception demandée.',
 'Colis déjà injecté chez GLS. Interception possible mais frais estimés à ~15€. Recommandation : accepter annulation et rembourser à réception retour.',
 'medium', 'Respecté', 'pending',
 now() - interval '90 minutes');
