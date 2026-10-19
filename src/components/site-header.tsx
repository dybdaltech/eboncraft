import { LogOut } from "lucide-react";
import { Github } from "@/components/github-icon";
import Link from "next/link";
import { signInWithGitHub, signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser, githubLogin } from "@/lib/supabase/server";

export async function SiteHeader() {
  const user = isSupabaseConfigured ? await getCurrentUser() : null;
  const login = githubLogin(user);
  const avatar = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-md bg-primary font-mono text-sm text-primary-foreground">E</span>
          <span>
            eboncraft<span className="text-muted-foreground">.dev</span>
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Browse
          </Link>
          {user && (
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {avatar && <img src={avatar} alt="" className="size-7 rounded-full border" />}
              <span className="hidden text-sm sm:inline">{login}</span>
              <form action={signOut}>
                <Button variant="ghost" size="icon" title="Sign out">
                  <LogOut />
                </Button>
              </form>
            </>
          ) : (
            <form action={signInWithGitHub}>
              <input type="hidden" name="next" value="/dashboard" />
              <Button size="sm" variant="outline" disabled={!isSupabaseConfigured}>
                <Github />
                <span className="hidden sm:inline">Sign in with GitHub</span>
                <span className="sm:hidden">Sign in</span>
              </Button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
