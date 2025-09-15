import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Registers a new organization administrator user within the Enterprise LMS.
 *
 * This operation creates the organization administrator entity in the database,
 * securely hashes the plaintext password provided in the request body, and
 * issues JWT access and refresh tokens upon successful creation. It supports
 * multi-tenant data isolation by associating the new user with the specified
 * tenant_id.
 *
 * Password hashing uses the centralized MyGlobal.password utility. JWT tokens
 * are signed using the system secret key with correct expiration and issuer.
 *
 * @param props - Object containing the creation payload for the new
 *   organization administrator.
 * @param props.body - Payload includes tenant_id (UUID), email (valid email),
 *   plaintext password, first and last names, and optional status.
 * @returns Authorized organization administrator info including JWT tokens.
 * @throws {Error} Throws if creation fails, including violation of uniqueness
 *   constraints.
 */
export async function postauthOrganizationAdminJoin(props: {
  body: IEnterpriseLmsOrganizationAdmin.ICreate;
}): Promise<IEnterpriseLmsOrganizationAdmin.IAuthorized> {
  const { body } = props;

  const hashedPassword = await MyGlobal.password.hash(body.password);
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.enterprise_lms_organizationadmin.create(
    {
      data: {
        id: id,
        tenant_id: body.tenant_id,
        email: body.email,
        password_hash: hashedPassword,
        first_name: body.first_name,
        last_name: body.last_name,
        status: body.status ?? "active",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  const accessTokenExpireMs = 3600 * 1000; // 1 hour
  const refreshTokenExpireMs = 7 * 24 * 3600 * 1000; // 7 days
  const nowTime = Date.now();

  const accessToken = jwt.sign(
    {
      userId: created.id,
      email: created.email,
      tenantId: created.tenant_id,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      userId: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: created.id,
    tenant_id: created.tenant_id,
    email: created.email,
    password_hash: created.password_hash,
    first_name: created.first_name,
    last_name: created.last_name,
    status: created.status,
    created_at: created.created_at ? toISOStringSafe(created.created_at) : now,
    updated_at: created.updated_at ? toISOStringSafe(created.updated_at) : now,
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(nowTime + accessTokenExpireMs)),
      refreshable_until: toISOStringSafe(
        new Date(nowTime + refreshTokenExpireMs),
      ),
    },
  };
}
