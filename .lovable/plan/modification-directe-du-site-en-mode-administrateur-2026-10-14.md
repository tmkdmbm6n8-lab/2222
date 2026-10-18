# Modification directe du site en mode administrateur

## Ce que vous verrez
- Connecté avec chesterfieldtms@gmail.com, un bandeau discret « Mode édition » apparaît en haut du site, avec un interrupteur Activer / Désactiver.
- En mode édition, chaque texte, titre, bouton, prix, photo et question de FAQ est entouré d'un léger contour vert au survol.
- Un clic ouvre une petite fenêtre : vous modifiez le texte (ou choisissez une nouvelle photo depuis votre ordinateur, ou changez un prix), puis « Enregistrer ». Le changement est visible tout de suite, pour tous les visiteurs.
- Un bouton « Revenir au texte d'origine » permet d'annuler une modification.
- Les visiteurs ne voient jamais ce mode ni les contours : seul votre compte administrateur peut modifier.

## Ce qui deviendra modifiable
- Tous les textes de toutes les pages : accueil, prestations, tarifs, configurateur (titres des étapes, libellés, « Temps de séchage », « Prix final TTC »…), réservation, contact, zone, à propos, FAQ, réalisations, pages légales, menu et pied de page.
- Toutes les photos : accueil, prestations, réalisations, logo.
- Les prix et frais de déplacement, directement sur la page Tarifs et dans les cartes de prestations.
- Coordonnées (téléphone, ville, horaires) partout où elles s'affichent.

## Limites honnêtes
- Les photos de mobilier du configurateur (qui changent selon l'état sale / taches / poils) restent gérées par moi, car elles sont assemblées avec les effets visuels.
- La mise en page (ordre des blocs, couleurs, ajout de nouvelles pages) reste à me demander dans le chat.

## Technical details
- Add a `content` record (key -> string) and `images` record to the business config schema with validated defaults; stored in existing `business_settings` row, saved via a new admin-only server function (has_role check) that patches a single key.
- `useAdmin()` hook: checks session + `has_role` RPC client-side for display only; the server function re-verifies.
- `<EditableText k="home.hero.title" fallback="..." />` and `<EditableImage k=...>` components wrap every hardcoded string across tclean components; numeric fields (prices, travel fee) use `<EditablePrice>` bound to existing config paths.
- Image uploads go to a new public `site-images` storage bucket, admin-write only via RLS.
- Invalidate `businessQuery` after save so SSR pages and SEO metadata reflect edits.
- Playwright check: admin edits a hero text and a price, anonymous visitor sees new values and no edit controls.
