/**
 * Request header carrying the user id that middleware already verified for the
 * current request, so a server render doesn't repeat the auth round trip.
 *
 * Lives in its own module so server components can import the name without
 * pulling in the edge middleware (and with it next/server and the Supabase
 * server client). Written in lib/supabase/middleware.ts, read in lib/auth.ts.
 */
export const SESSION_USER_HEADER = "x-whetstone-user-id";
