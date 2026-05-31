export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold text-primary">Hors ligne</h1>
      <p className="text-foreground/70">
        Vous n&apos;êtes pas connecté à Internet. Réessayez lorsque la connexion sera rétablie.
      </p>
    </main>
  );
}
