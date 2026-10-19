import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mt-24 text-center">
      <p className="font-mono text-sm text-primary">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Nothing here</h1>
      <p className="mt-2 text-muted-foreground">That addon isn&apos;t listed, or the link is wrong.</p>
      <Link href="/" className="mt-6 inline-block text-sm text-primary hover:underline">
        Browse addons
      </Link>
    </div>
  );
}
