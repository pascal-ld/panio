import Link from "next/link";
import { PanioLogo } from "@/components/brand/PanioLogo";

export default function InscriptionMerciPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex justify-center">
          <PanioLogo size={88} priority />
        </div>
        <h1 className="text-2xl font-bold text-primary">Vérifiez votre e-mail</h1>
        <p className="mt-4 text-foreground/70">
          Nous vous avons envoyé un lien de confirmation. Cliquez dessus pour activer votre compte,
          puis connectez-vous.
        </p>
        {process.env.NEXT_PUBLIC_MAIL_URL ? (
          <p className="mt-2 text-sm text-foreground/50">
            En développement, consultez Mailpit :{" "}
            <a
              href={process.env.NEXT_PUBLIC_MAIL_URL}
              className="font-medium text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {process.env.NEXT_PUBLIC_MAIL_URL.replace(/^https?:\/\//, "")}
            </a>
          </p>
        ) : null}
        <Link
          href="/login"
          className="mt-8 inline-block rounded-lg bg-primary px-6 py-2.5 font-semibold text-white transition hover:bg-primary-light"
        >
          Aller à la connexion
        </Link>
      </div>
    </main>
  );
}
