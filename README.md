This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Accès aux fiches et administration

Les listes d’étudiants sont paginées et consultables par établissement. Avant
autorisation ou paiement, l’API ne renvoie que le nom et le prénom; les autres
colonnes ne sont chargées qu’après vérification côté serveur. Les utilisateurs
peuvent demander un accès depuis une fiche; la demande devient un ticket et la
réponse de l’administrateur est visible dans « Mes tickets ».

Configurez les accès et Stripe dans `.env`:

- `ADMIN_EMAILS`: adresses vérifiées des administrateurs initiaux, séparées
  par des virgules. Elles ne donnent les droits admin qu’aux comptes dont
  `emailVerified` vaut `true`; ces comptes peuvent ensuite gérer les rôles
  depuis `/dashboard/admin`.
- `STUDENT_DIRECTORY_EMAILS`: adresses autorisées à rechercher les étudiants
  avec l’assistant et à consulter les fiches sans paiement. L’adresse du compte
  doit également être vérifiée.
- `STRIPE_SECRET_KEY`, `STRIPE_PROFILE_PRICE_ID` et
  `NEXT_PUBLIC_APP_URL`: clé secrète, identifiant du prix Stripe (paiement
  ponctuel par fiche) et URL publique de l’application.
- `STRIPE_WEBHOOK_SECRET`: secret du webhook Stripe. Configurez le webhook sur
  `/api/stripe/webhook` pour les événements
  `checkout.session.completed` et `checkout.session.async_payment_succeeded`.

Après configuration du schéma, appliquez les migrations:

```bash
npx prisma migrate deploy
npx prisma generate
```

Les décisions de ticket sont notifiées dans l’espace client; aucun fournisseur
d’e-mail transactionnel n’est configuré par défaut.
Seuls les comptes utilisateurs peuvent créer des tickets. Depuis
`/dashboard/admin`, les administrateurs peuvent répondre aux tickets ou envoyer
un message direct à un utilisateur; ce dernier le reçoit dans ses notifications.

L’assistant utilise `GROQ_VISION_MODEL` pour les images et
`GROQ_DOCUMENT_MODEL` (par défaut `GROQ_MODEL`) pour les documents dont le texte
est extrait côté serveur. Les formats pris en charge comprennent les images
JPEG/PNG/WebP/GIF, PDF, DOCX/PPTX/XLSX, ODT/ODP/ODS/ODG, RTF, EPUB, LaTeX, HTML,
Markdown, CSV et texte brut. Pour activer l’OCR des images incorporées et des
PDF scannés, définissez `DOCUMENT_OCR_ENABLED=true`; les langues par défaut
sont le français, l’arabe et l’anglais (`DOCUMENT_OCR_LANGUAGE`). Les formats
arbitraires ne peuvent pas tous être interprétés et les documents protégés par
mot de passe peuvent nécessiter leur mot de passe.

Pour initialiser le premier administrateur, créez son compte, vérifiez son
adresse par votre processus de confiance, puis ajoutez cette adresse à
`ADMIN_EMAILS`. En l’absence d’un fournisseur d’e-mail configuré, ne marquez
`emailVerified` comme vrai que pour un compte dont l’identité a été vérifiée
hors bande.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
