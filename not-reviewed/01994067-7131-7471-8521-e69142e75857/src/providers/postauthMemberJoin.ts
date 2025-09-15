import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Register a new member user with unique email and hashed password.
 *
 * This operation checks for duplicate emails in the OAuth server members table,
 * securely hashes the plaintext password, and stores the new member record with
 * initial email verification set to false.
 *
 * Upon successful registration, JWT access and refresh tokens are generated and
 * returned along with the member data in the authorized response format.
 *
 * @param props - Object containing member info and registration data
 * @param props.member - Authenticated member payload (not used here, but
 *   required by API signature)
 * @param props.body - Member registration info including email and plaintext
 *   password
 * @returns The authorized member information including tokens and expiry
 *   details
 * @throws {Error} Throws error if email is already registered
 */
export async function postauthMemberJoin(props: {
  member: MemberPayload;
  body: IOauthServerMember.ICreate;
}): Promise<IOauthServerMember.IAuthorized> {
  const { body } = props;

  // Check if email already exists
  const existing = await MyGlobal.prisma.oauth_server_members.findFirst({
    where: { email: body.email, deleted_at: null },
  });
  if (existing) throw new Error("Email already registered");

  // Hash the password
  const hashedPassword = await MyGlobal.password.hash(body.password);

  // Generate UUID for new member id
  const id = v4() as string & tags.Format<"uuid">;

  // Get current date-time as ISO string
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create new member record
  const created = await MyGlobal.prisma.oauth_server_members.create({
    data: {
      id,
      email: body.email,
      email_verified: false,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
    },
  });

  // Generate JWT tokens
  const accessToken = jwt.sign(
    { id: created.id, email: created.email },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { id: created.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Calculate expiration timestamps as ISO strings
  const currentTimestamp = Date.now();
  const accessExpiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(currentTimestamp + 3600 * 1000),
  );
  const refreshExpiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(currentTimestamp + 7 * 24 * 3600 * 1000),
  );

  // Compose authorization token info
  const token: IOauthServerMember.IAuthorized["token"] = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };

  // Return full authorized member data
  return {
    id: created.id,
    email: created.email,
    email_verified: created.email_verified,
    password_hash: created.password_hash,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? null,

    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 3600,

    token,
  };
}
