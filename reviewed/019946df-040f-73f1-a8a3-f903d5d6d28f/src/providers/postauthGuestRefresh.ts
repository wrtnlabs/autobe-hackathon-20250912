import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Refresh JWT tokens for guest users using a valid refresh token.
 *
 * This function verifies the provided refresh token, validates the guest
 * account's status, and issues new access and refresh tokens with the
 * guest-level payload structure.
 *
 * @param props - Object containing the guest payload and request body with
 *   refresh token
 * @param props.guest - Authenticated guest payload (not used for token
 *   validation)
 * @param props.body - Request body containing the refresh token
 * @returns The authorized guest user information including new JWT tokens
 * @throws {Error} Throws error if the refresh token is invalid, expired, guest
 *   user is not found, deleted, or inactive
 */
export async function postauthGuestRefresh(props: {
  guest: GuestPayload;
  body: IEnterpriseLmsGuest.IRefresh;
}): Promise<IEnterpriseLmsGuest.IAuthorized> {
  const { body } = props;

  let decodedToken: unknown;
  try {
    decodedToken = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  if (
    typeof decodedToken !== "object" ||
    decodedToken === null ||
    !("id" in decodedToken) ||
    typeof (decodedToken as { id?: unknown }).id !== "string"
  ) {
    throw new Error("Invalid token payload");
  }

  const userId = decodedToken.id as string;

  const guest = await MyGlobal.prisma.enterprise_lms_guest.findUnique({
    where: { id: userId },
  });

  if (!guest) {
    throw new Error("Guest user not found");
  }

  if (guest.deleted_at !== null) {
    throw new Error("Guest user is deleted");
  }

  if (guest.status !== "active") {
    throw new Error("Guest user is not active");
  }

  const accessTokenPayload = {
    id: guest.id,
    type: "guest",
  };

  const access_token = jwt.sign(
    accessTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshTokenPayload = {
    id: guest.id,
    token_type: "refresh",
  };

  const refresh_token = jwt.sign(
    refreshTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: guest.id,
    tenant_id: guest.tenant_id,
    email: guest.email,
    password_hash: guest.password_hash,
    first_name: guest.first_name,
    last_name: guest.last_name,
    status: guest.status,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
    access_token,
    refresh_token,
    token: {
      access: access_token,
      refresh: refresh_token,
      expired_at: toISOStringSafe(new Date(Date.now() + 3600 * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 3600 * 1000),
      ),
    },
  };
}
