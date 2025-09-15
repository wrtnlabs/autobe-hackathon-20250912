import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Register new systemAdmin account in storyfield_ai_systemadmins table with JWT
 * token return.
 *
 * This operation securely onboards a new system administrator by inserting a
 * new record into the 'storyfield_ai_systemadmins' table using the provided
 * external_admin_id and email. Uniqueness is enforced on both fields. Returns a
 * JWT-based authorized session structure and creates an initial token session
 * record for the admin.
 *
 * No password is stored or involved; credential management is handled
 * externally (SSO/JWT).
 *
 * @param props - Registration details for the new system admin
 * @param props.body - Registration payload containing external_admin_id, email,
 *   and optional actor_type
 * @returns The authorized session representation for the newly registered
 *   system admin, including tokens and audit metadata
 * @throws {Error} When the external_admin_id or email is already registered as
 *   a system admin
 */
export async function postauthSystemAdminJoin(props: {
  body: IStoryfieldAiSystemAdmin.IJoin;
}): Promise<IStoryfieldAiSystemAdmin.IAuthorized> {
  const { body } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Always generate a new UUID for primary key
  const adminId: string & tags.Format<"uuid"> = v4();
  // If actor_type is omitted, default to 'systemAdmin'
  const actor_type = body.actor_type ?? "systemAdmin";

  // Enforce uniqueness: external_admin_id and email must not exist
  const duplicate = await MyGlobal.prisma.storyfield_ai_systemadmins.findFirst({
    where: {
      OR: [
        { external_admin_id: body.external_admin_id },
        { email: body.email },
      ],
    },
  });
  if (duplicate) {
    throw new Error(
      "A system admin with this external_admin_id or email already exists.",
    );
  }

  // Create the system admin account
  const created = await MyGlobal.prisma.storyfield_ai_systemadmins.create({
    data: {
      id: adminId,
      external_admin_id: body.external_admin_id,
      email: body.email,
      actor_type: actor_type,
      created_at: now,
      updated_at: now,
    },
  });

  // JWT token (1 hour expiry for access, 7 days for refresh)
  const accessTokenExpiresInMs = 1000 * 60 * 60; // 1 hour
  const refreshTokenExpiresInMs = 1000 * 60 * 60 * 24 * 7; // 7 days
  const accessExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + accessTokenExpiresInMs),
  );
  const refreshableUntil: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + refreshTokenExpiresInMs),
  );

  // JWT payload per contract
  const accessToken = jwt.sign(
    {
      id: adminId,
      type: actor_type,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      id: adminId,
      type: actor_type,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Create token session for admin (required for all JWT usage)
  // Token hash is stored using secure hash (never plain token)
  await MyGlobal.prisma.storyfield_ai_token_sessions.create({
    data: {
      id: v4(),
      system_admin_id: adminId,
      token_hash: await MyGlobal.password.hash(accessToken),
      fingerprint: v4(),
      issued_at: now,
      expires_at: accessExpiredAt,
      refreshed_at: undefined,
      last_activity_at: now,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    },
  });

  // Return full admin authorized DTO
  return {
    id: created.id,
    external_admin_id: created.external_admin_id,
    email: created.email,
    actor_type: created.actor_type,
    last_login_at: undefined,
    admin_notes: undefined,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
