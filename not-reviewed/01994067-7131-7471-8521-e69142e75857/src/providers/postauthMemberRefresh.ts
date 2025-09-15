import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Refresh JWT tokens for member user.
 *
 * This endpoint accepts a valid refresh token issued to a member and verifies
 * its validity including non-expiration and non-revocation. Upon successful
 * verification, it issues new JWT access and refresh tokens using the member's
 * current data.
 *
 * @param props - Object containing the authenticated member payload and request
 *   body.
 * @param props.member - Authenticated member payload with member ID.
 * @param props.body - Request body containing the refresh token string.
 * @returns The new authorization data including member info and renewed tokens.
 * @throws {Error} When the refresh token is invalid, expired, or revoked.
 * @throws {Error} When the member user associated with the token is not found.
 */
export async function postauthMemberRefresh(props: {
  member: MemberPayload;
  body: IOauthServerMember.IRefresh;
}): Promise<IOauthServerMember.IAuthorized> {
  const { body } = props;

  // Step 1: Look up the refresh token record by token, ensure active and unexpired
  const refresh = await MyGlobal.prisma.oauth_server_refresh_tokens.findFirst({
    where: {
      token: body.refresh_token,
      deleted_at: null,
      expires_at: {
        gt: toISOStringSafe(new Date()),
      },
    },
  });

  if (!refresh) {
    throw new Error("Invalid refresh token");
  }

  // Step 2: Get the member user data, ensure active
  const member = await MyGlobal.prisma.oauth_server_members.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
  });

  if (!member) {
    throw new Error("Member not found");
  }

  // Step 3: Define token expiry durations (seconds)
  const accessTokenExpiresIn = 60 * 60; // 1 hour
  const refreshTokenExpiresIn = 7 * 24 * 60 * 60; // 7 days

  // Step 4: Generate new JWT access token with payload
  const accessToken = jwt.sign(
    {
      id: member.id,
      email: member.email,
      email_verified: member.email_verified,
      type: "member",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: accessTokenExpiresIn,
      issuer: "autobe",
    },
  );

  // Step 5: Generate new JWT refresh token with payload
  const refreshToken = jwt.sign(
    {
      id: member.id,
      type: "member",
      token_type: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshTokenExpiresIn,
      issuer: "autobe",
    },
  );

  // Step 6: Prepare returned authorization token info
  const nowISO = toISOStringSafe(new Date());
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + accessTokenExpiresIn * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + refreshTokenExpiresIn * 1000),
  );

  // Step 7: Return the full authorized member data
  return {
    id: member.id,
    email: member.email,
    email_verified: member.email_verified,
    password_hash: member.password_hash,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: accessTokenExpiresIn,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
