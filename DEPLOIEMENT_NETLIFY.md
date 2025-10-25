# Guide de déploiement Strudel sur Netlify

## Prérequis
- Un compte Netlify (gratuit sur [netlify.com](https://netlify.com))
- Un dépôt Git (GitHub, GitLab, ou Bitbucket)

## Étapes de déploiement

### Option 1 : Via l'interface Netlify (Recommandée)

1. **Pousser votre code sur Git**
   ```bash
   git init
   git add .
   git commit -m "Version française de Strudel"
   git remote add origin <URL_DE_VOTRE_DEPOT>
   git push -u origin main
   ```

2. **Connecter à Netlify**
   - Allez sur [app.netlify.com](https://app.netlify.com)
   - Cliquez sur "Add new site" → "Import an existing project"
   - Connectez votre compte Git (GitHub/GitLab/Bitbucket)
   - Sélectionnez votre dépôt Strudel

3. **Configuration du build**
   Netlify détectera automatiquement la configuration depuis `netlify.toml` :
   - Base directory: `website`
   - Build command: `pnpm build`
   - Publish directory: `dist`

4. **Installer pnpm sur Netlify**
   - Allez dans "Site settings" → "Build & deploy" → "Environment"
   - Ajoutez une variable d'environnement :
     - Key: `NPM_FLAGS`
     - Value: `--version`
   - Netlify installera automatiquement pnpm

5. **Déployer**
   - Cliquez sur "Deploy site"
   - Attendez quelques minutes pendant le build
   - Votre site sera disponible sur une URL comme `https://random-name.netlify.app`

### Option 2 : Via Netlify CLI

```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Se connecter
netlify login

# Initialiser le site
netlify init

# Déployer
netlify deploy --prod
```

## Configuration post-déploiement

### Personnaliser le domaine
1. Dans Netlify, allez dans "Site settings" → "Domain management"
2. Vous pouvez :
   - Changer le sous-domaine `.netlify.app`
   - Ajouter un domaine personnalisé

### Activer HTTPS
- HTTPS est activé automatiquement par Netlify
- Les certificats SSL sont gratuits via Let's Encrypt

### Variables d'environnement
Si vous avez besoin de variables d'environnement :
- Allez dans "Site settings" → "Build & deploy" → "Environment"
- Ajoutez vos variables

## Builds automatiques
- Chaque push sur la branche `main` déclenchera un nouveau build automatiquement
- Vous pouvez configurer des branches de prévisualisation dans les paramètres

## Résolution de problèmes

### Le build échoue
- Vérifiez les logs de build dans Netlify
- Assurez-vous que pnpm est bien configuré
- Vérifiez que toutes les dépendances sont présentes

### Les assets ne se chargent pas
- Vérifiez le chemin de base dans `astro.config.mjs`
- Assurez-vous que les chemins sont relatifs

## Support
- Documentation Netlify : https://docs.netlify.com
- Documentation Astro : https://docs.astro.build
- Discord Strudel : https://discord.com/invite/HGEdXmRkzT

Votre version française de Strudel sera accessible en ligne ! 🚀