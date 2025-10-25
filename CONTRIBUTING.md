# 🌀 Contribuer à Strudel 🌀

Merci de vouloir contribuer !!! Il existe de nombreuses façons d'apporter de la valeur à ce projet

## Déménagement vers codeberg

Nous sommes actuellement en train de déménager de github vers codeberg -- tout ne fonctionne pas encore, merci de votre patience.

Pour mettre à jour votre clone local, vous pouvez exécuter cette commande :

```
git remote set-url origin git@codeberg.org:uzu/strudel.git
```


## Canaux de Communication

Pour entrer en contact avec les contributeurs, soit

- [rejoindre le canal Discord de Tidal](https://discord.com/invite/HGEdXmRkzT) et aller sur le canal #strudel
- Trouver des discussions connexes sur le [forum tidal club](https://club.tidalcycles.org/)

## Poser une Question

Si vous avez des questions sur strudel, assurez-vous d'avoir parcouru la
[documentation](https://strudel.cc/learn/) pour voir si elle répond à votre question.
Sinon, utilisez l'un des canaux de communication ci-dessus !

N'ayez pas peur de poser des questions ! Votre question pourrait être de grande valeur pour d'autres personnes aussi.

## Donner un Retour

Que vous ayez utilisé le REPL Strudel ou que vous utilisiez les packages strudel, nous sommes heureux d'entendre vos retours.
Utilisez l'un des canaux de communication listés ci-dessus et envoyez-nous un message !

## Partager de la Musique

Si vous avez créé de la musique avec strudel, vous pouvez rendre un peu d'amour et partager ce que vous avez fait !
Votre création pourrait également faire partie de la sélection aléatoire dans le REPL si vous le souhaitez.
Utilisez l'un des canaux de communication listés ci-dessus.

## Améliorer la Documentation

Si vous trouvez des points faibles dans la [documentation](https://strudel.cc/workshop/getting-started/),
vous pouvez éditer chaque fichier directement sur codeburg. (nous sommes en train de corriger les liens "Éditer cette page" dans la barre latérale droite)

## Proposer une Fonctionnalité

Si vous voulez une fonctionnalité spécifique qui ne fait pas encore partie de strudel, n'hésitez pas à utiliser l'un des canaux de communication ci-dessus.
Peut-être voulez-vous même aider à l'implémentation de cette fonctionnalité !

## Signaler un Bug

Si vous avez trouvé un bug, ou un comportement qui ne semble pas correct, vous êtes bienvenu pour créer une [issue](https://codeberg.org/uzu/strudel/issues).
Veuillez vérifier qu'il n'a pas déjà été signalé auparavant.

## Corriger un Bug

Pour corriger un bug qui a été signalé,

1. vérifiez que personne d'autre ne le corrige déjà et répondez à l'issue pour informer les gens que vous vous en occupez
2. forkez le dépôt
3. assurez-vous d'avoir configuré le projet (voir ci-dessous)
4. corrigez le bug (espérons-le)
5. assurez-vous que les tests passent
6. envoyez une pull request

## Écrire des Tests

Il y a encore beaucoup de tests qui n'ont pas encore été écrits ! Lire et écrire des tests est une excellente opportunité pour se familiariser avec la base de code.
Vous pouvez trouver les tests dans chaque package dans le dossier `test`. Pour exécuter tous les tests, exécutez `pnpm test` depuis le dossier racine.

## Configuration du Projet

Pour faire fonctionner le projet pour le développement, assurez-vous d'avoir installé :

- [git](https://git-scm.com/)
- [node](https://nodejs.org/en/) >= 18
- [pnpm](https://pnpm.io/) (`curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION=8.11.0 sh -`)

ensuite, faites ce qui suit :

```sh
git clone https://codeberg.org/uzu/strudel.git && cd strudel
pnpm i # installer à la racine pour créer des liens symboliques des packages
pnpm start # démarrer le repl
```

Ces commandes peuvent sembler légèrement différentes pour votre système d'exploitation.
Veuillez signaler tout problème que vous avez rencontré avec les instructions de configuration !

## Style de Code

Pour s'assurer que le code ne change que là où il le devrait, nous utilisons prettier pour unifier le style de code.

- Vous pouvez formater tous les fichiers en une fois en exécutant `pnpm codeformat` depuis la racine du projet
- Exécutez `pnpm format-check` depuis la racine du projet pour vérifier si tous les fichiers sont bien formatés

Si vous utilisez VSCode, vous pouvez

1. installer [l'extension prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
2. ouvrir la palette de commandes et exécuter "Format Document With..."
3. Choisir "Configure Default Formatter..."
4. Sélectionner prettier

## ESLint

Pour prévenir les erreurs d'exécution indésirables, ce projet utilise [eslint](https://eslint.org/).

- Vous pouvez vérifier les erreurs lint en exécutant `pnpm lint`

Il existe également des extensions / plugins eslint pour la plupart des éditeurs.

## Exécuter les Tests

- Exécuter tous les tests avec `pnpm test`
- Exécuter tous les tests avec l'UI en utilisant `pnpm test-ui`

## Exécuter toutes les Vérifications CI

Lors de l'ouverture d'une PR, le runner CI vérifiera automatiquement le style de code et eslint, ainsi que l'exécution de tous les tests.
Vous pouvez exécuter la même vérification avec `pnpm check`

## Workflow des Packages

Le projet est divisé en plusieurs [packages](https://codeberg.org/uzu/strudel/src/branch/main/packages) avec versionnage indépendant.
Lorsque vous exécutez `pnpm i` sur le dossier racine, [pnpm workspaces](https://pnpm.io/workspaces) installera toutes les dépendances de tous les sous-packages. Cela permettra à n'importe quel fichier js d'importer `@strudel/<nom-du-package>` pour obtenir la version locale,
permettant de développer plusieurs packages en même temps.

## Publication des Packages

Pour publier tous les packages qui ont été modifiés depuis la dernière version, exécutez :

```sh
npm login

# cela incrémentera toutes les versions dans les fichiers package.json des packages non privés aux versions sélectionnées
npx lerna version --no-private

# publier tous les packages à l'intérieur de /packages en utilisant pnpm! n'utilisez pas lerna pour publier!!
pnpm --filter "./packages/**" publish --dry-run

# la dernière commande n'était qu'un dry-run. si tout semble ok, exécutez ceci:

pnpm --filter "./packages/**" publish --access public
```

Pour publier manuellement un seul package, augmentez la version dans le `package.json`, puis exécutez `pnpm publish`.
Important : Toujours publier avec `pnpm`, car `npm` ne supporte pas le remplacement des fichiers main dans `publishConfig`, ce qui est fait dans tous les packages.


## commandes utiles

```sh
#régénérer les snapshots de test (ex: lors de la mise à jour ou de la création de nouvelles fonctions de pattern)
pnpm snapshot 

#démarrer le serveur OSC
pnpm run osc

#construire la version standalone
pnpm tauri build
```

## patching de tags de version

voici un petit guide sur comment patcher les patterns dans la base de données pour éviter de casser les anciens patterns en raison de changements cassants dans les nouvelles versions.

la tactique générale est d'utiliser `// @version x.y` pour taguer un pattern avec une version strudel spécifique. lorsqu'un pattern est évalué, ces métadonnées désactiveront tous les changements cassants qui sont venus après la version spécifiée.
par exemple, dans la version 1.1, la valeur par défaut pour `fanchor` a été changée de `0.5` à `0`.
si on joue un pattern qui a été créé avant ce changement, les sons qui utilisent des enveloppes de filtre peuvent sonner très différemment, donc en ajoutant `// @version 1.0` il sonnera comme avant.
avant de publier une nouvelle version avec des changements cassants, nous pouvons éditer tous les patterns dans la base de données, en insérant le tag de version sous lequel ils ont été créés :

comme exemple, pour publier la version 1.2, faites ce qui suit :

1. obtenir la plage de dates

```sh
# obtenir la date de la dernière version:
git log -1 --format=%aI @strudel/core@1.1.0
# 2024-05-31T23:07:26+02:00

# obtenir la date de la version actuelle:
git log -1 --format=%aI @strudel/core@1.2.0
# 2025-05-01T12:39:24+02:00
# peut aussi utiliser le timestamp d'aujourd'hui si la version n'est pas encore publiée
```

maintenant nous savons, tous les patterns entre ces 2 dates doivent recevoir un tag de version (sauf s'ils en ont déjà un).

2. obtenir les patterns en question

```sql
SELECT *
FROM code_v1
WHERE code NOT LIKE '%@version%'
AND created_at > '2024-05-31T23:07:26+02:00'
AND created_at < '2025-05-01T12:39:24+02:00'
ORDER BY created_at ASC;
```

cela nous donne tous les patterns non versionnés qui ont été sauvegardés entre 1.1.0 et 1.2.0. dans ce cas, c'est 9373 patterns !

3. insérer les tags de version

nous sommes maintenant prêts à insérer le tag de version à ces patterns.
avant de mettre à jour des milliers de patterns, c'est probablement une bonne idée de tester si un seul est mis à jour :

```sql
UPDATE code_v1
SET code = code || E'\n// @version 1.1'
WHERE hash = 'Ns2sMB40yIw4';
```

après avoir [vérifié](https://strudel.cc/?Ns2sMB40yIw4) que le tag de version a été ajouté, insérons-le partout :

```sql
UPDATE code_v1
SET code = code || E'\n// @version 1.1'
WHERE code NOT LIKE '%@version%'
AND created_at > '2024-05-31T23:07:26+02:00'
AND created_at < '2025-05-01T12:39:24+02:00'
```

4. vérifier

nous pouvons vérifier que les modifications ont fonctionné en interrogeant tous les patterns qui contiennent le nouveau tag de version :

```sql
SELECT *
FROM code_v1
WHERE code LIKE '%@version 1.1%'
AND created_at > '2024-05-31T23:07:26+02:00'
AND created_at < '2025-05-01T12:39:24+02:00'
ORDER BY created_at ASC;
```


## Amusez-vous

N'oubliez pas de vous amuser, et que ce projet est porté par la passion des bénévoles !
