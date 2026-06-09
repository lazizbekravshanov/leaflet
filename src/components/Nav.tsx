import { getCurrentUser } from "@/lib/auth";
import { NavShell } from "@/components/NavShell";

// Server wrapper: reads the session so auth state is right on first paint.
// All chrome behavior (scroll shadow, menu) lives in the client shell.
export async function Nav() {
  const user = await getCurrentUser();
  return (
    <NavShell
      user={
        user
          ? { username: user.username, avatarUrl: user.avatarUrl }
          : null
      }
    />
  );
}
