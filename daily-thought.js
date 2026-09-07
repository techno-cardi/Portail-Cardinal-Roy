(() => {
  const TIMEZONE = 'America/Toronto';
  const DATA = `
2026-09-08 | « Il est des portes sur la mer que l'on ouvre avec des mots. » — Rafael Alberti
2026-09-09 | « Les mots diversement rangés font un divers sens, et les sens diversement rangés font différents effets. » — Blaise Pascal
2026-09-10 | « Je prends beaucoup plus de plaisir à m'instruire moi-même que non pas à mettre par écrit le peu que je sais. » — René Descartes
2026-09-11 | « Devant une flamme, dès qu'on rêve, ce que l'on perçoit n'est rien au regard de ce qu'on imagine. » — Gaston Bachelard
2026-09-14 | « Un bon auteur, et qui écrit avec soin, éprouve souvent que l'expression qu'il cherchait est celle qui était la plus simple et la plus naturelle. » — Jean de La Bruyère
2026-09-15 | « Il y a toujours une nouvelle façon de regarder ce qu'on connaît. » — Auteur inconnu
2026-09-16 | « À l'œuvre on connaît l'artisan. » — Proverbe français
2026-09-17 | « Un mot précis peut rendre une idée beaucoup plus légère. » — Auteur inconnu
2026-09-18 | « Hâtez-vous lentement, et, sans perdre courage, vingt fois sur le métier remettez votre ouvrage. » — Nicolas Boileau
2026-09-21 | « Il y a du bonheur dans toute espèce de talent. » — Honoré de Balzac
2026-09-22 | « Interroger, c'est enseigner. » — Xénophon
2026-09-23 | « L'homme n'est heureux que de vouloir et d'inventer. » — Alain
2026-09-24 | « Assurons-nous bien du fait avant de nous inquiéter de la cause. » — Fontenelle
2026-09-25 | « Comprendre quelque chose de nouveau est une petite victoire tranquille. » — Auteur inconnu
2026-09-28 | « Chacun ne peut voir qu'à sa lampe ; mais il peut marcher ou agir à la lumière d'autrui. » — Joseph Joubert
2026-09-29 | « Ce livre est écrit beaucoup avec le rêve, un peu avec le souvenir. » — Victor Hugo
2026-09-30 | « Une idée bien accueillie peut en inviter plusieurs autres. » — Auteur inconnu
2026-10-01 | « Je me sers d'animaux pour instruire les hommes. » — Jean de La Fontaine
2026-10-02 | « Une idée claire rend le chemin plus agréable. » — Auteur inconnu
2026-10-05 | « La curiosité transforme les détails en découvertes. » — Auteur inconnu
2026-10-06 | « Apprendre, c'est aussi relier ce qu'on savait déjà. » — Auteur inconnu
2026-10-07 | « Les grandes découvertes commencent souvent par une petite curiosité. » — Auteur inconnu
2026-10-08 | « La clarté orne les pensées profondes. » — Vauvenargues
2026-10-09 | « Petit à petit, l'oiseau fait son nid. » — Proverbe français
2026-10-13 | « Le style est la poésie dans la prose. » — Alain
2026-10-14 | « Une idée partagée peut en faire naître plusieurs autres. » — Auteur inconnu
2026-10-15 | « L'automne colore les chemins avant même qu'on pense à les regarder. » — Auteur inconnu
2026-10-16 | « Octobre sait transformer une simple promenade en tableau. » — Auteur inconnu
2026-10-19 | « Les couleurs d'automne donnent aux journées un air de nouveauté. » — Auteur inconnu
2026-10-20 | « Une feuille d'automne suffit parfois à rappeler la beauté des détails. » — Auteur inconnu
2026-10-21 | « Les journées fraîches ont leur propre façon d'être lumineuses. » — Auteur inconnu
2026-10-22 | « L'automne invite les couleurs à prendre un peu plus de place. » — Auteur inconnu
2026-10-23 | « Novembre possède une douceur discrète qu'on remarque en ralentissant. » — Auteur inconnu
2026-10-26 | « Les arbres d'automne savent rendre le changement spectaculaire. » — Auteur inconnu
2026-10-27 | « Une journée grise peut encore contenir beaucoup de couleurs. » — Auteur inconnu
2026-10-28 | « L'automne donne aux paysages une autre façon de raconter le temps. » — Auteur inconnu
2026-10-29 | « Les feuilles au sol font parfois les plus beaux chemins. » — Auteur inconnu
2026-10-30 | « Octobre ajoute de la couleur jusque dans les journées ordinaires. » — Auteur inconnu
2026-11-02 | « Le vent d'automne sait renouveler le décor en quelques minutes. » — Auteur inconnu
2026-11-03 | « Les saisons changent, et le paysage trouve toujours une nouvelle beauté. » — Auteur inconnu
2026-11-04 | « Une touche de fantaisie suffit parfois à rendre une journée mémorable. » — Auteur inconnu
2026-11-05 | « Tout est bien qui finit bien. » — Proverbe français
2026-11-06 | « Les mots deviennent plus vivants quand on comprend ce qu'ils transportent. » — Auteur inconnu
2026-11-09 | « Il suffit parfois d'un détail pour réveiller la curiosité. » — Auteur inconnu
2026-11-10 | « Lire, c'est laisser entrer d'autres paysages dans sa journée. » — Auteur inconnu
2026-11-11 | « Après la pluie, le beau temps. » — Proverbe français
2026-11-12 | « Le commencement de toutes les sciences, c'est l'étonnement de ce que les choses sont ce qu'elles sont. » — Aristote
2026-11-13 | « Vivre, ce n'est pas respirer, c'est agir. » — Jean-Jacques Rousseau
2026-11-16 | « Une page peut suffire pour donner envie d'en lire cent autres. » — Auteur inconnu
2026-11-17 | « Chaque lecture agrandit un peu la carte du monde. » — Auteur inconnu
2026-11-18 | « Le chemin vers une réponse peut être aussi intéressant que la réponse. » — Auteur inconnu
2026-11-19 | « Il voudrait donner à manger aux mots dans le creux de sa main. » — Jules Renard
2026-11-20 | « Les savoirs aiment se relier les uns aux autres. » — Auteur inconnu
2026-11-23 | « Apprendre, c'est collectionner des façons de comprendre. » — Auteur inconnu
2026-11-24 | « Les idées se rencontrent souvent là où on ne les attendait pas. » — Auteur inconnu
2026-11-25 | « Il n'y a de bonheur possible pour personne sans le soutien du courage. » — Alain
2026-11-26 | « Je n'ai fait celle-ci plus longue que parce que je n'ai pas eu le loisir de la faire plus courte. » — Blaise Pascal
2026-11-27 | « Une idée devient plus nette quand on prend le temps de la regarder. » — Auteur inconnu
2026-11-30 | « Trouver d'abord. Chercher après. » — Jean Cocteau
2026-12-01 | « Le plaisir de découvrir donne de l'élan aux idées. » — Auteur inconnu
2026-12-02 | « La musique, c'est du bruit qui pense. » — Victor Hugo
2026-12-03 | « Le jeu n'a pas d'autre sens que lui-même. » — Roger Caillois
2026-12-04 | « Le monde devient plus vaste à mesure qu'on le découvre. » — Auteur inconnu
2026-12-07 | « Décembre donne aux petits gestes un peu plus de lumière. » — Auteur inconnu
2026-12-08 | « Les lumières de décembre rendent les fins de journée un peu plus douces. » — Auteur inconnu
2026-12-09 | « Une année bien remplie mérite aussi quelques moments légers. » — Auteur inconnu
2026-12-10 | « Les derniers jours avant les vacances ont un éclat bien à eux. » — Auteur inconnu
2026-12-11 | « Décembre sait faire briller les détails les plus simples. » — Auteur inconnu
2026-12-14 | « Les petites attentions donnent souvent aux journées leur plus belle lumière. » — Auteur inconnu
2026-12-15 | « Une ambiance chaleureuse commence parfois par un simple sourire. » — Auteur inconnu
2026-12-16 | « Les bons moments de décembre se construisent souvent avec peu de choses. » — Auteur inconnu
2026-12-17 | « Avant les vacances, il reste toujours une place pour une belle découverte. » — Auteur inconnu
2026-12-18 | « Les journées d'hiver peuvent être courtes et pourtant pleines de lumière. » — Auteur inconnu
2027-01-05 | « Une question posée avec curiosité est déjà un début d'exploration. » — Auteur inconnu
2027-01-06 | « Observer longtemps permet parfois de voir autrement. » — Auteur inconnu
2027-01-07 | « Les mots sont de petits outils pour construire de grandes idées. » — Auteur inconnu
2027-01-08 | « Revois deux fois pour voir juste, ne vois qu'une pour voir beau. » — Henri-Frédéric Amiel
2027-01-11 | « Il n'est mois qui ne revienne. » — Proverbe français
2027-01-12 | « L'art véritable n'est pas seulement l'expression d'un sentiment, mais aussi le résultat d'une vive intelligence. » — Hendrik Petrus Berlage
2027-01-13 | « Une idée peut prendre son temps avant de devenir évidente. » — Auteur inconnu
2027-01-14 | « Une image vaut mille mots. » — Proverbe populaire
2027-01-15 | « Une journée devient plus riche dès qu'on y apprend quelque chose. » — Auteur inconnu
2027-01-18 | « Les découvertes aiment les esprits qui leur laissent une place. » — Auteur inconnu
2027-01-19 | « Les mots donnent une forme aux idées. » — Auteur inconnu
2027-01-20 | « Dans les petites boîtes sont les fines épices. » — Proverbe français
2027-01-21 | « L'observation est l'investigation d'un phénomène naturel, et l'expérience est l'investigation d'un phénomène modifié par l'investigateur. » — Claude Bernard
2027-01-22 | « Les mots ont le pouvoir de rapprocher les idées. » — Auteur inconnu
2027-01-25 | « L'accent circonflexe est l'hirondelle de l'écriture. » — Jules Renard
2027-01-26 | « Chaque chose en son temps. » — Sagesse populaire
2027-01-27 | « Une question peut rendre familier ce qui semblait lointain. » — Auteur inconnu
2027-01-28 | « Tout amuse quand on y met de la persévérance : l'homme qui apprendrait par cœur un dictionnaire finirait par y trouver du plaisir. » — Gustave Flaubert
2027-01-29 | « Il faut manger pour vivre, et non pas vivre pour manger. » — Molière
2027-02-01 | « Apprendre quelque chose, c'est aussi apprendre à mieux regarder. » — Auteur inconnu
2027-02-02 | « La nature fait toujours les choses les plus belles et les meilleures autant que possible. » — Aristote
2027-02-03 | « Une petite pause peut laisser une grande idée arriver. » — Auteur inconnu
2027-02-04 | « Les livres qu'on se propose de relire dans l'âge mûr sont assez semblables aux lieux où l'on voudrait vieillir. » — Joseph Joubert
2027-02-05 | « Chaque notion comprise rend la suivante un peu plus accessible. » — Auteur inconnu
2027-02-08 | « Un mot gentil peut rendre une journée plus légère. » — Auteur inconnu
2027-02-09 | « La gentillesse tient souvent dans des gestes très simples. » — Auteur inconnu
2027-02-10 | « Un sourire partagé ajoute quelque chose de bon à la journée. » — Auteur inconnu
2027-02-11 | « Une attention sincère ne prend que quelques secondes et reste parfois longtemps. » — Auteur inconnu
2027-02-12 | « Les journées sont plus agréables quand la bienveillance y trouve une petite place. » — Auteur inconnu
2027-02-15 | « Les petits ruisseaux font les grandes rivières. » — Proverbe français
2027-02-16 | « Le temps a laissé son manteau de vent, de froidure et de pluie, et s'est vêtu de broderie, de soleil luisant, clair et beau. » — Charles d'Orléans
2027-02-17 | « Les découvertes n'ont pas besoin d'être grandes pour compter. » — Auteur inconnu
2027-02-18 | « À l'impossible nul n'est tenu. » — Proverbe français
2027-02-19 | « La nature ne fait rien en vain. » — Aristote
2027-02-22 | « La mission de l'art n'est pas de copier la nature, mais de l'exprimer. » — Honoré de Balzac
2027-02-23 | « Rien ne sert de courir ; il faut partir à point. » — Jean de La Fontaine
2027-02-24 | « Apprendre prend parfois la forme d'un déclic minuscule. » — Auteur inconnu
2027-02-25 | « Le soleil luit pour tout le monde. » — Proverbe français
2027-02-26 | « Il y a des découvertes qui commencent par un simple regard. » — Auteur inconnu
2027-03-08 | « Recommencer peut être aussi simple que de faire le prochain petit pas. » — Auteur inconnu
2027-03-09 | « Un retour est parfois une bonne occasion de regarder les choses autrement. » — Auteur inconnu
2027-03-10 | « Après une pause, les idées reviennent souvent avec un peu plus d'espace. » — Auteur inconnu
2027-03-11 | « Un nouveau départ n'a pas besoin d'être grand pour être réel. » — Auteur inconnu
2027-03-12 | « Reprendre doucement permet aussi d'avancer. » — Auteur inconnu
2027-03-15 | « Une idée nouvelle donne parfois envie d'en chercher dix autres. » — Auteur inconnu
2027-03-16 | « La clarté est la bonne foi des philosophes. » — Vauvenargues
2027-03-17 | « Instinct et intelligence représentent deux solutions divergentes, également élégantes, d'un seul et même problème. » — Henri Bergson
2027-03-18 | « Comprendre est parfois simplement une autre façon de regarder. » — Auteur inconnu
2027-03-19 | « Pour les petits enfants, l'éducation c'est le maître d'école ; pour les jeunes gens, c'est le poète. » — Aristophane
2027-03-22 | « Le printemps commence souvent par des signes presque invisibles. » — Auteur inconnu
2027-03-23 | « Écrire, c'est une façon de parler sans être interrompu. » — Jules Renard
2027-03-24 | « Un livre peut faire voyager sans déplacer une seule chaise. » — Auteur inconnu
2027-03-25 | « Les journées qui rallongent donnent un peu plus d'espace aux idées. » — Auteur inconnu
2027-03-30 | « La nature fait toujours, selon les conditions dont elle dispose et autant que possible, les choses les plus belles et les meilleures. » — Aristote
2027-03-31 | « En commençant, pense à finir. » — Proverbe français
2027-04-01 | « Le printemps remet de la couleur dans les détails. » — Auteur inconnu
2027-04-02 | « Qui va lentement va sûrement et va loin. » — Proverbe populaire
2027-04-05 | « Paris ne s'est pas fait en un jour. » — Proverbe français
2027-04-06 | « Un bourgeon suffit parfois à annoncer tout un changement de saison. » — Auteur inconnu
2027-04-07 | « Un homme instruit a toujours en lui ses richesses. » — Phèdre
2027-04-08 | « Une bonne explication ressemble parfois à une fenêtre qu'on ouvre. » — Auteur inconnu
2027-04-09 | « Le retour de la lumière transforme doucement les journées. » — Auteur inconnu
2027-04-12 | « L'esprit le plus pénétrant a besoin du secours du temps pour s'assurer, par ses secondes pensées, de la justice des premières. » — Henri-François d'Aguesseau
2027-04-13 | « Chaque lecture offre une nouvelle façon de nommer le monde. » — Auteur inconnu
2027-04-14 | « Le printemps rappelle que les paysages savent toujours se renouveler. » — Auteur inconnu
2027-04-15 | « Nos vrais plaisirs consistent dans le libre usage de nous-mêmes. » — Buffon
2027-04-16 | « Je n'ai jamais eu de chagrin qu'une heure de lecture n'ait dissipé. » — Montesquieu
2027-04-19 | « Les premières journées douces ont le goût d'une page qu'on tourne. » — Auteur inconnu
2027-04-20 | « La musique est l'âme de la géométrie. » — Paul Claudel
2027-04-21 | « Un grand obstacle au bonheur, c'est de s'attendre à un trop grand bonheur. » — Fontenelle
2027-04-22 | « Le ciel du printemps change souvent, et c'est aussi ce qui le rend intéressant. » — Auteur inconnu
2027-04-23 | « Tous les chemins mènent à Rome. » — Proverbe français
2027-04-26 | « Une lecture courte peut laisser une longue trace de curiosité. » — Auteur inconnu
2027-04-27 | « Les couleurs reviennent parfois avant qu'on ait pensé à les attendre. » — Auteur inconnu
2027-04-28 | « Chaque explication réussie ajoute un pont entre deux idées. » — Auteur inconnu
2027-04-29 | « Chaque question donne une direction possible à la curiosité. » — Auteur inconnu
2027-04-30 | « Le printemps a le talent de rendre les petits signes faciles à remarquer. » — Auteur inconnu
2027-05-03 | « Tous les goûts sont dans la nature. » — Proverbe français
2027-05-04 | « Les idées poussent mieux quand on leur donne de l'espace. » — Auteur inconnu
2027-05-05 | « Les bonnes idées aiment qu'on leur laisse un peu de temps. » — Auteur inconnu
2027-05-06 | « La victoire aime l'effort. » — Catulle
2027-05-07 | « Ce que l'on conçoit bien s'énonce clairement, et les mots pour le dire arrivent aisément. » — Nicolas Boileau
2027-05-10 | « Le plus difficile au monde est de dire en y pensant ce que tout le monde dit sans y penser. » — Alain
2027-05-11 | « Une journée riche n'est pas forcément une journée compliquée. » — Auteur inconnu
2027-05-12 | « Le bonheur s'attache aux plus fragiles aspects, et naît, de préférence, des choses minimes et du vent. » — Robert Brasillach
2027-05-13 | « Les questions sont de petites invitations à explorer. » — Auteur inconnu
2027-05-14 | « Il faut viser haut pour ne pas tomber trop bas. » — Proverbe français
2027-05-17 | « Les idées aiment les chemins qui ne sont pas toujours droits. » — Auteur inconnu
2027-05-18 | « Chaque matin offre une page neuve à remplir. » — Auteur inconnu
2027-05-19 | « Dans la pensée scientifique, la méditation de l'objet par le sujet prend toujours la forme du projet. » — Gaston Bachelard
2027-05-20 | « La mélodie consiste en une certaine fluidité de sons coulants et doux comme le miel d'où elle a tiré son nom. » — Joseph Joubert
2027-05-21 | « L'enfance a des manières de voir, de penser, de sentir qui lui sont propres. » — Jean-Jacques Rousseau
2027-05-25 | « Le vrai bonheur coûte peu ; s'il est cher, il n'est pas d'une bonne espèce. » — Chateaubriand
2027-05-26 | « Une bonne idée n'a pas besoin d'être compliquée pour être intéressante. » — Auteur inconnu
2027-05-27 | « Apprendre, c'est se retrouver. » — Malcolm de Chazal
2027-05-28 | « Le théâtre doit être une lumière pour l'intelligence. » — Romain Rolland
2027-05-31 | « La poésie, c'est comme le radium ; pour en obtenir un gramme, il faut des années d'effort. » — Vladimir Maïakovski
2027-06-01 | « Les grands esprits se rencontrent. » — Proverbe français
2027-06-02 | « Apprendre transforme peu à peu l'inconnu en paysage familier. » — Auteur inconnu
2027-06-03 | « Il n'y a point de montagne sans vallée. » — Proverbe français
2027-06-04 | « Le hasard fait bien les choses. » — Proverbe français
2027-06-07 | « J'apprends tous les jours à écrire. » — Buffon
2027-06-08 | « La patience est l'art d'espérer. » — Vauvenargues
2027-06-09 | « Une année se termine, mais ce qu'on a appris continue de voyager avec nous. » — Auteur inconnu
2027-06-10 | « Le chemin parcouru se voit parfois mieux quand on approche de l'arrivée. » — Auteur inconnu
2027-06-11 | « Enseigner, c'est apprendre deux fois. » — Joseph Joubert
2027-06-14 | « Les maîtres d'écoles sont des jardiniers en intelligences humaines. » — Victor Hugo
2027-06-15 | « Il n'y a pas d'efforts inutiles, Sisyphe se faisait les muscles. » — Roger Caillois
2027-06-16 | « Un seul printemps dans l'année, et dans la vie une seule jeunesse. » — Simone de Beauvoir
2027-06-17 | « Un mot si joli qu'on le voudrait avec des joues, pour l'embrasser. » — Jules Renard
2027-06-18 | « Les derniers jours d'une année scolaire ont leur propre lumière. » — Auteur inconnu
2027-06-21 | « L'éducation consiste à nous donner des idées, et la bonne éducation à les mettre en proportion. » — Montesquieu
2027-06-22 | « Finir une étape, c'est aussi voir tout ce qui s'est ajouté en chemin. » — Auteur inconnu
2027-06-23 | « Les pages se tournent, mais les découvertes restent disponibles pour la suite. » — Auteur inconnu
`;

  const THOUGHTS = new Map();
  DATA.trim().split('\n').forEach(line => {
    const match = line.match(/^(\d{4}-\d{2}-\d{2})\s+\|\s+«\s*(.*?)\s*»\s+—\s+(.+)$/);
    if (match) THOUGHTS.set(match[1], [match[2], match[3].trim()]);
  });

  const dateKey = value => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(value);
    const fields = {};
    parts.forEach(part => {
      if (part.type !== 'literal') fields[part.type] = part.value;
    });
    return `${fields.year}-${fields.month}-${fields.day}`;
  };

  const ensureStyle = () => {
    if (document.getElementById('daily-thought-style')) return;
    const style = document.createElement('style');
    style.id = 'daily-thought-style';
    style.textContent = `
      .daily-thought{
        width:min(820px,100%);
        margin:0 0 8px;
        padding:8px 11px;
        display:flex;
        align-items:baseline;
        gap:9px;
        color:#fff;
        border:1px solid rgba(255,255,255,.18);
        border-left:3px solid rgba(255,255,255,.62);
        border-radius:9px;
        background:rgba(255,255,255,.055);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
        animation:dailyThoughtIn .32s ease-out both;
      }
      .daily-thought-label{
        flex:0 0 auto;
        white-space:nowrap;
        color:#f5d8e0;
        font-size:.69rem;
        font-weight:800;
        letter-spacing:.045em;
        text-transform:uppercase;
      }
      .daily-thought-text{
        min-width:0;
        font-size:.84rem;
        line-height:1.32;
      }
      .daily-thought-quote{
        font-style:italic;
        font-family:"IBM Plex Serif",Georgia,serif;
      }
      .daily-thought-author{
        margin-left:.35em;
        color:#f6dde3;
        font-style:normal;
        font-weight:700;
        white-space:nowrap;
      }
      @keyframes dailyThoughtIn{
        from{opacity:0;transform:translateY(-3px)}
        to{opacity:1;transform:none}
      }
      @media(max-width:620px){
        .daily-thought{
          display:block;
          margin-bottom:8px;
          padding:8px 10px 9px;
          text-align:center;
        }
        .daily-thought-label{
          display:block;
          margin-bottom:3px;
          font-size:.66rem;
        }
        .daily-thought-text{
          display:block;
          font-size:.86rem;
          line-height:1.35;
        }
        .daily-thought-author{white-space:normal}
      }
      @media(prefers-reduced-motion:reduce){.daily-thought{animation:none}}
    `;
    document.head.appendChild(style);
  };

  const render = () => {
    const host = document.querySelector('.search-stage-inner');
    const intro = host?.querySelector('.search-intro');
    if (!host || !intro) return false;

    const key = dateKey(new Date());
    const item = THOUGHTS.get(key);
    let block = document.getElementById('daily-thought');

    if (!item) {
      block?.remove();
      return true;
    }

    ensureStyle();

    if (!block) {
      block = document.createElement('aside');
      block.id = 'daily-thought';
      block.className = 'daily-thought';
      block.setAttribute('aria-label', 'Pensée du jour');
      block.innerHTML = `
        <span class="daily-thought-label">✦ Pensée du jour</span>
        <span class="daily-thought-text">
          <span class="daily-thought-quote"></span>
          <span class="daily-thought-author"></span>
        </span>`;
    }

    block.querySelector('.daily-thought-quote').textContent = `« ${item[0]} »`;
    block.querySelector('.daily-thought-author').textContent = `- ${item[1]}`;
    block.dataset.thoughtDate = key;

    const ticker = document.getElementById('school-news-ticker');
    const reference = ticker || intro;
    if (block.parentElement !== host || block.nextElementSibling !== reference) {
      host.insertBefore(block, reference);
    }
    return true;
  };

  if (!render()) {
    const observer = new MutationObserver(() => {
      if (render()) observer.disconnect();
    });
    observer.observe(document.getElementById('app') || document.body, {childList:true,subtree:true});
    window.setTimeout(() => observer.disconnect(), 12000);
  }

  // Si le portail reste ouvert pendant un changement de date, la pensée se met
  // à jour sans rechargement. Les jours absents du calendrier restent vides.
  window.setInterval(render, 60 * 1000);
})();