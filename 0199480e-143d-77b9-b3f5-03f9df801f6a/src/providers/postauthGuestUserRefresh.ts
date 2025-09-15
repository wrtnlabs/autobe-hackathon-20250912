import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ILibraryManagementGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ILibraryManagementGuestUser";
import { GuestuserPayload } from "../decorators/payload/GuestuserPayload";

/**
 * Refresh guest user authorization tokens.
 *
 * This function verifies the existence of the guest user by id, ensures the
 * user is not soft deleted, then generates new JWT access and refresh tokens
 * with proper expiration for maintaining temporary session continuity.
 *
 * @param props - Object containing the guestUser payload with user id and type.
 * @param props.guestUser - The authenticated guest user payload carrying user
 *   id.
 * @returns Refreshed authorization data including guest user properties and
 *   tokens.
 * @throws {Error} When the guest user is not found or is soft deleted.
 */
export async function postauthGuestUserRefresh(props: {
  guestUser: GuestuserPayload;
}): Promise<ILibraryManagementGuestUser.IAuthorized> {
  const { guestUser } = props;

  const guest = await MyGlobal.prisma.library_management_guestusers.findFirst({
    where: { id: guestUser.id, deleted_at: null },
  });

  if (!guest) throw new Error("Guest user not found or deleted");

  const accessTokenExpiryMs = 1000 * 60 * 60; // 1 hour
  const refreshTokenExpiryMs = 1000 * 60 * 60 * 24 * 7; // 7 days

  const accessToken = jwt.sign(
    { id: guest.id, type: "guestUser" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    { id: guest.id, type: "guestUser", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const nowMs = Date.now();

  return {
    id: guest.id,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(nowMs + accessTokenExpiryMs)),
      refreshable_until: toISOStringSafe(
        new Date(nowMs + refreshTokenExpiryMs),
      ),
    },
  };
}
