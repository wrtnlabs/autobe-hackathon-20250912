import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Registers a new admin user account on the OAuth server.
 *
 * This operation performs the following steps:
 *
 * - Verifies uniqueness of the provided email address.
 * - Hashes the provided plain password securely.
 * - Creates a new admin user record with audit timestamps and soft delete
 *   support.
 * - Generates JWT access and refresh tokens for authentication.
 *
 * @param props.admin - The authenticated admin context (not used here but
 *   required by spec).
 * @param props.body - The request body containing email, plain password, and
 *   email verification flag.
 * @returns The created admin information along with JWT tokens for
 *   authentication.
 * @throws {Error} If the email is already registered.
 */
export async function postauthAdminJoin(props: {
  admin: AdminPayload;
  body: IOauthServerAdmin.ICreate;
}): Promise<IOauthServerAdmin.IAuthorized> {
  const { body } = props;

  // Check for existing email
  const existingAdmin = await MyGlobal.prisma.oauth_server_admins.findFirst({
    where: { email: body.email },
    select: { id: true },
  });

  if (existingAdmin !== null) {
    throw new Error("Email already registered");
  }

  // Generate UUID for id
  const newId = v4() as string & tags.Format<"uuid">;

  // Hash password
  const hashedPassword = await MyGlobal.password.hash(body.password);

  // Prepare timestamps
  const nowIso = toISOStringSafe(new Date());

  // Create admin record
  const created = await MyGlobal.prisma.oauth_server_admins.create({
    data: {
      id: newId,
      email: body.email,
      email_verified: body.email_verified,
      password_hash: hashedPassword,
      created_at: nowIso,
      updated_at: nowIso,
      deleted_at: null,
    },
  });

  // Calculate expiration timestamps for tokens
  const accessExpiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000)); // 1h
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  ); // 7d

  // Generate access token
  const accessToken = jwt.sign(
    {
      userId: created.id,
      email: created.email,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  // Generate refresh token
  const refreshToken = jwt.sign(
    {
      userId: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: created.id,
    email: created.email,
    email_verified: created.email_verified,
    password_hash: created.password_hash,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: created.deleted_at ?? null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  };
}
