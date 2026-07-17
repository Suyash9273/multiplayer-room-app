import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Same-origin only — the browser calls this on our own domain right after
// login, using whatever session cookie Better Auth just set. We don't rely
// on the bearer() plugin's `set-auth-token` response header here, because
// that header is only attached to the sign-in response itself, and for
// Google OAuth that response is a full-page redirect our client JS never
// sees. Instead we just read the same cookie our Express server would read,
// and hand back the same raw token it looks up sessions by — the two sides
// end up trusting the exact same value either way.
// Better Auth prefixes its session cookie with `__Secure-` in production
// (any HTTPS deployment) — see Better Auth's cookie docs. Locally over
// http:// it's the plain name. Check both rather than hardcoding one.
const PLAIN_NAME = "better-auth.session_token";
const SECURE_NAME = "__Secure-better-auth.session_token";

export async function GET() {
    const cookieStore = await cookies();
    const sessionCookie =
        cookieStore.get(SECURE_NAME)?.value ?? cookieStore.get(PLAIN_NAME)?.value;

    if (!sessionCookie) {
        return NextResponse.json({ token: null });
    }

    // Better Auth's cookie format is `<token>.<signature>` — same
    // normalization apps/server/src/lib/identity.ts applies before looking
    // the token up in the Session table.
    const rawToken = sessionCookie.split(".")[0];
    return NextResponse.json({ token: rawToken });
}
