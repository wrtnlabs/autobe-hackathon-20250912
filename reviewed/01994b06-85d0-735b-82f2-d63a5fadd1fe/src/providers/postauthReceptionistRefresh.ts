import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Refresh a receptionist's JWT tokens (healthcare_platform_auth_sessions)
 *
 * This endpoint allows an authenticated receptionist to refresh their access
 * token using a valid refresh token. It looks up the receptionist's session in
 * 'healthcare_platform_auth_sessions', ensuring the refresh token is still
 * valid, active, and unrevoked. If successful, new JWT tokens are issued and
 * the session record is updated/rotated. The receptionist user record is
 * checked for active status; deleted or inactive accounts are denied access.
 * All critical date/datetime values are converted to "string &
 * tags.Format<'date-time'>". All operations are fully audit-logged via the
 * application stack.
 *
 * @param props - The request properties.
 * @param props.body - The object containing the refresh_token string.
 * @returns The authorized receptionist credentials with new JWT tokens
 * @throws {Error} If the refresh token is invalid, expired, revoked, or does
 *   not belong to an active receptionist account.
 */
export async function postauthReceptionistRefresh(props: {
  body: IHealthcarePlatformReceptionist.IRefresh;
}): Promise<IHealthcarePlatformReceptionist.IAuthorized> {
  const { body } = props;

  // Step 1: Find a valid auth session matching the refresh_token
  const session =
    await MyGlobal.prisma.healthcare_platform_auth_sessions.findFirst({
      where: {
        refresh_token: body.refresh_token,
        revoked_at: null,
      },
    });
  if (!session) {
    throw new Error("Invalid or revoked refresh token");
  }
  // Step 2: Check session expiry
  const now = toISOStringSafe(new Date()); // string & tags.Format<'date-time'>
  if (toISOStringSafe(session.expires_at) < now) {
    throw new Error("Session expired");
  }
  // Only receptionist sessions accepted
  if (session.user_type !== "receptionist") {
    throw new Error("Invalid session type");
  }

  // Step 3: Look up the receptionist by user_id. Must be active (deleted_at is null)
  const receptionist =
    await MyGlobal.prisma.healthcare_platform_receptionists.findFirst({
      where: {
        id: session.user_id,
        deleted_at: null,
      },
    });
  if (!receptionist) {
    throw new Error("Receptionist not found or inactive");
  }

  // Step 4: Build common JWT payload and issue new tokens
  const jwtPayload = {
    id: receptionist.id,
    type: "receptionist",
  };
  const jwtOptions = {
    issuer: "autobe",
  };
  // Access token: 1 hour expiry. Refresh token: 7 days expiry.
  const accessToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    ...jwtOptions,
    expiresIn: "1h",
  });
  const refreshToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    ...jwtOptions,
    expiresIn: "7d",
  });
  // Defensive decode type-check
  function getExp(token: string): number {
    const decoded = jwt.decode(token);
    if (
      decoded &&
      typeof decoded === "object" &&
      "exp" in decoded &&
      typeof (decoded as any).exp === "number"
    ) {
      return (decoded as any).exp;
    }
    return 0;
  }
  const accessExp = getExp(accessToken);
  const refreshExp = getExp(refreshToken);
  // Step 5: Update the DB session with new issued tokens (do not update session_token here; only refresh_token)
  await MyGlobal.prisma.healthcare_platform_auth_sessions.update({
    where: { id: session.id },
    data: {
      refresh_token: refreshToken,
    },
  });

  // Step 6: Format and return
  return {
    id: receptionist.id,
    email: receptionist.email,
    full_name: receptionist.full_name,
    phone: receptionist.phone ?? undefined,
    created_at: toISOStringSafe(receptionist.created_at),
    updated_at: toISOStringSafe(receptionist.updated_at),
    deleted_at: receptionist.deleted_at
      ? toISOStringSafe(receptionist.deleted_at)
      : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(accessExp * 1000)),
      refreshable_until: toISOStringSafe(new Date(refreshExp * 1000)),
    },
  };
}
