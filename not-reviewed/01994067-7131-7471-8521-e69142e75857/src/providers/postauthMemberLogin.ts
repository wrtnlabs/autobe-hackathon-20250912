import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Authenticates a member user by email and password.
 *
 * This operation verifies the provided email and password against stored member
 * records, ensuring active status (no soft deletion). Upon successful
 * authentication, JWT access and refresh tokens are generated and returned
 * along with member metadata.
 *
 * @param props - Object containing the login credentials and member payload.
 * @param props.member - Member payload containing id and type fields.
 * @param props.body - Login credentials including email and plain password.
 * @returns The authorized member information with JWT tokens.
 * @throws {Error} When credentials are invalid (email not found or password
 *   mismatch).
 */
export async function postauthMemberLogin(props: {
  member: MemberPayload;
  body: IOauthServerMember.ILogin;
}): Promise<IOauthServerMember.IAuthorized> {
  const { body } = props;

  const member = await MyGlobal.prisma.oauth_server_members.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (!member) {
    throw new Error("Invalid credentials");
  }

  const isValid = await MyGlobal.password.verify(
    body.password,
    member.password_hash,
  );

  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  const now = toISOStringSafe(new Date());

  const expiresInSeconds = 3600; // 1 hour
  const refreshExpiresInSeconds = 7 * 24 * 3600; // 7 days

  const accessToken = jwt.sign(
    {
      id: member.id,
      email: member.email,
      type: "member",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: member.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

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
    expires_in: expiresInSeconds,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(
        new Date(Date.now() + expiresInSeconds * 1000),
      ),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + refreshExpiresInSeconds * 1000),
      ),
    },
  };
}
