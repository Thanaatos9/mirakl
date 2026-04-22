# Branchement DUST dans le workflow n8n

## Option A : Remplacer OpenAI par DUST (recommandé)

Le workflow utilise actuellement le node `OpenAI` natif. Pour utiliser DUST à la place :

### 1. Installer le node communautaire

Dans n8n → **Settings** → **Community Nodes** → installer :

```
n8n-nodes-dust
```

### 2. Configurer les credentials DUST

- **API Key** : depuis le dashboard DUST → Settings → API Keys
- **Workspace ID** : visible dans l'URL de votre workspace DUST
- **Region** : `EU` ou `US`

### 3. Modifier le workflow

Remplacer le node **"AI — Classify & Recommend"** par un node **Dust** :

- **Operation** : Talk to an Agent
- **Agent Configuration ID** : l'ID de votre agent DUST (dans Manage Agents)
- **Message** : `{{ $json.user_prompt }}`

Le reste du workflow (Parse & Guardrails → branches) reste identique.

### 4. Configurer l'agent DUST

Dans DUST, créer un agent "Aria SAV" avec :
- **Model** : GPT-4o ou GPT-4o-mini
- **Instructions** : copier le `system_prompt` du node "Prepare AI Input" dans le workflow
- **Output format** : JSON strict

## Option B : Garder OpenAI direct

Le workflow fonctionne tel quel avec le node OpenAI natif. Il suffit de configurer les credentials OpenAI dans n8n.

## Avantage de DUST

- Gouvernance centralisée des prompts
- RAG possible sur vos données marchandes
- Historique des conversations agent
- Permissions par workspace
