import { useSettings } from '@src/settings.mjs';

const { BASE_URL } = import.meta.env;
const baseNoTrailing = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

export function WelcomeTab({ context }) {
  const { fontFamily } = useSettings();
  return (
    <div className="prose dark:prose-invert min-w-full pt-2 font-sans pb-8 px-4 " style={{ fontFamily }}>
      <h3>꩜ accueil</h3>
      <p>
        Vous avez trouvé <span className="underline">strudel</span>, une nouvelle plateforme de live coding pour écrire de la musique dynamique
        dans le navigateur ! C'est gratuit, open-source et conçu pour les débutants comme pour les experts. Pour commencer :
        <br />
        <br />
        <span className="underline">1. lancez la lecture</span> - <span className="underline">2. modifiez quelque chose</span> -{' '}
        <span className="underline">3. mettez à jour</span>
        {/* <br />
        If you don't like what you hear, try <span className="underline">shuffle</span>! */}
      </p>
      <p>
        {/* To learn more about what this all means, check out the{' '} */}
        Pour commencer, consultez le{' '}
        <a href={`${baseNoTrailing}/workshop/getting-started/`} target="_blank">
          tutoriel interactif
        </a>
        . N'hésitez pas non plus à rejoindre le{' '}
        <a href="https://discord.com/invite/HGEdXmRkzT" target="_blank">
          canal Discord
        </a>{' '}
        pour poser des questions, donner votre avis ou simplement dire bonjour.
      </p>
      <h3>꩜ à propos</h3>
      <p>
        Strudel est une version JavaScript de{' '}
        <a href="https://tidalcycles.org/" target="_blank">
          tidalcycles
        </a>
        , un langage de live coding populaire pour la musique, écrit en Haskell. Strudel est un logiciel libre et open-source :
        vous pouvez le redistribuer et/ou le modifier selon les termes de la{' '}
        <a href="https://codeberg.org/uzu/strudel/src/branch/main/LICENSE" target="_blank">
          Licence Publique Générale Affero GNU
        </a>
        . Vous pouvez trouver le code source sur{' '}
        <a href="https://codeberg.org/uzu/strudel" target="_blank">
          codeberg
        </a>
        . Vous pouvez également trouver des <a href="https://github.com/felixroos/dough-samples/blob/main/README.md">informations de licence</a>{' '}
        pour les banques de sons par défaut. Veuillez envisager de{' '}
        <a href="https://opencollective.com/tidalcycles" target="_blank">
          soutenir ce projet
        </a>{' '}
        pour assurer son développement continu 💖
      </p>
    </div>
  );
}
