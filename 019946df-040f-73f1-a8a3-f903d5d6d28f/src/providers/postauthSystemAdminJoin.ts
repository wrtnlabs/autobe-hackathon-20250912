import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Register a new system administrator account.
 *
 * This endpoint creates a new system administrator with secure password
 * hashing. It associates the system administrator with an active tenant, issues
 * JWT access and refresh tokens for authentication, and returns the authorized
 * user info.
 *
 * @param props - The registration request including systemAdmin payload and
 *   user data
 * @param props.systemAdmin - The systemAdmin payload (not used for
 *   authorization here)
 * @param props.body - The registration data for the new system administrator
 * @returns The authorized system administrator including authentication tokens
 * @throws {Error} When no active tenant is found to associate the new
 *   administrator
 * @throws {Error} When the provided email is already registered
 */
export async function postauthSystemAdminJoin(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsSystemAdmin.ICreate;
}): Promise<IEnterpriseLmsSystemAdmin.IAuthorized> {
  const tenant = await MyGlobal.prisma.enterprise_lms_tenants.findFirst({
    where: { deleted_at: null },
    select: { id: true },
  });

  if (!tenant) {
    throw new Error("No active tenant found for registration.");
  }

  const existing = await MyGlobal.prisma.enterprise_lms_systemadmin.findUnique({
    where: { email: props.body.email },
  });

  if (existing) {
    throw new Error("Email already in use.");
  }

  const hashedPassword = await MyGlobal.password.hash(props.body.password_hash);

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.enterprise_lms_systemadmin.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      tenant_id: tenant.id,
      email: props.body.email,
      password_hash: hashedPassword,
      first_name: props.body.first_name,
      last_name: props.body.last_name,
      status: props.body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  const accessTokenExpiresIn = 3600; // 1 hour in seconds
  const refreshTokenExpiresIn = 7 * 24 * 3600; // 7 days in seconds

  const accessToken = jwt.sign(
    {
      id: created.id,
      email: created.email,
      type: "systemadmin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: accessTokenExpiresIn,
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshTokenExpiresIn,
      issuer: "autobe",
    },
  );

  return {
    id: created.id,
    tenant_id: tenant.id,
    email: created.email,
    password_hash: created.password_hash,
    first_name: created.first_name,
    last_name: created.last_name,
    status: created.status,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(
        new Date(Date.now() + accessTokenExpiresIn * 1000),
      ),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + refreshTokenExpiresIn * 1000),
      ),
    },
  };
}
