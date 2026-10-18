<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application architecture
- Client account summaries derive from the authenticated request list through a pure tested helper, with its history limit disclosed; keep account presentation separate from administrative panels.
- Resolve persisted development logo paths to the bundled logo at the public configuration boundary, retaining legacy image overrides so published branding works without discarding owner edits.
- Keep all public commercial data in the business settings configuration with a validated default fallback; this makes contact details, catalog, pricing, content and SEO consistent.
- Public pages use leaf route metadata and shared TClean presentation components; the services parent renders Outlet so service pages mount independently.
- Use TanStack server functions for request submission and authenticated administration; secrets and private photos must never enter route loaders or browser bundles.
- Administrators are authorized through the separate user_roles table and RLS, never through UI state; no production administrator is assigned until the owner identifies their account.
- Store all visitor submissions in quote_requests with private attachments, validation and durable rate limits; never promise email delivery without configured and tested sending.
- Availability entries represent alternative starts and may overlap; active bookings reserve a persisted time range protected by a database exclusion constraint, so simultaneous conflicting submissions cannot both succeed. Duration comes from validated business settings; changes affect new bookings, not existing occupied ranges.
- Use the shared Paris-time monthly BookingCalendar in both booking flows, keeping unavailable starts visible without exposing customer information.
- Generate period availability with the shared validated Paris-time helper and an admin-authorized atomic RPC; reuse existing starts without modifying occupied periods to prevent duplicates and preserve reservations.
- Service CTAs pass a validated furniture search parameter to the configurator, using the shared service-to-furniture mapping so navigation and defaults stay consistent.
- The sofa configurator model and pricing engine live in one shared pure module used by browser and server; the server recomputes amounts so client totals are never trusted.
- Calculate conditional travel charges through the shared business helper against the complete service subtotal; display paid travel only when the known total qualifies and keep fee and threshold administrable.
- Furniture previews use bundled photographic assets and alpha-masked condition effects in a shared presentation component; selection and comparison views must use the same renderer so state changes remain consistent.
- Inline editing keys text, images and typography by original value with audience filtering; validated character ranges carry partial text styles without accepting HTML. Use native font selectors to avoid portal stacking conflicts. Editor snapshots exclude commercial settings and privileges; categorized history restores truncate before the selected entry without recording the undo.
- Persist editable site colors as validated semantic token overrides and page-scoped structural element overrides in business settings; shared CSS generation applies them to visitors while authenticated server functions restrict writes to administrators.
- Discount rules (account percentage + promo codes, additive, capped at 100 %) live in src/lib/discounts.ts and are recomputed server-side in submitRequest; promo codes are validated only through server functions.
- Online payment uses built-in Stripe embedded checkout with price_data built from the stored request amount (never the browser total) and automatic_tax; the webhook marks quote_requests.payment_status.
- Button redirections are stored in config.links keyed by "label|original href" and applied by the site-editor DOM layer with client-side navigation.
- Reviews publish immediately through a rate-limited function. Intervention gallery entries keep legacy photos and add one video plus three before/after photos; admin signed uploads use private site-images and its public media route.
- Espace client : messages de statut insérés dans request_messages + client_notifications (sert uniquement à la pastille rouge « Contact »), messagerie affichée sur /contact pour le client connecté ; réservations confirmées automatiquement côté serveur 4 s après l’enregistrement.
- Pas d'e-mail ni SMS : le client est informé uniquement sur le site (owner sans domaine, choix explicite).
- Edit-mode deletions are site-wide, keyed by element signature (button label|href, image src, tag+text) in config.hidden with JSON {label,page,at} metadata, which doubles as the restore history; legacy page-scoped elementColors display:none stays restorable.
- The TClean bot posts one AI-generated (with deterministic fallback) preparation/care message per order from a signed-in client, stored as request_messages.is_bot; it runs server-side in submitRequest and never throws.
