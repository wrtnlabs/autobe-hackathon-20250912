import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new organization administrator user within the Enterprise LMS
 * system.
 *
 * This operation creates a new organization administrator associated with the
 * specified tenant. It validates tenant existence and email uniqueness within
 * the tenant, hashes the plaintext password, and sets default status if not
 * provided.
 *
 * @param props - Object containing authentication and creation data.
 * @param props.organizationAdmin - Authenticated organization admin performing
 *   the operation.
 * @param props.body - The creation data for the new organization admin,
 *   including plaintext password.
 * @returns The created organization administrator record with all fields except
 *   plaintext password.
 * @throws {Error} When the specified tenant does not exist.
 * @throws {Error} When the email is already used within the tenant.
 */
export async function postenterpriseLmsOrganizationAdminOrganizationadmins(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsOrganizationAdmin.ICreate;
}): Promise<IEnterpriseLmsOrganizationAdmin> {
  const { organizationAdmin, body } = props;

  // Verify tenant existence
  const tenant = await MyGlobal.prisma.enterprise_lms_tenants.findUnique({
    where: { id: body.tenant_id },
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${body.tenant_id}`);
  }

  // Check for email uniqueness within the tenant
  const existing =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findFirst({
      where: {
        tenant_id: body.tenant_id,
        email: body.email,
      },
    });

  if (existing) {
    throw new Error(`Email already used in this tenant: ${body.email}`);
  }

  // Hash the plaintext password
  const password_hash = await MyGlobal.password.hash(body.password);

  // Prepare current timestamp
  const now = toISOStringSafe(new Date());

  // Create new organization administrator
  const created = await MyGlobal.prisma.enterprise_lms_organizationadmin.create(
    {
      data: {
        id: v4(),
        tenant_id: body.tenant_id,
        email: body.email,
        password_hash: password_hash,
        first_name: body.first_name,
        last_name: body.last_name,
        status: body.status ?? "active",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  // Return the created record
  return {
    id: created.id,
    tenant_id: created.tenant_id,
    email: created.email,
    password_hash: created.password_hash,
    first_name: created.first_name,
    last_name: created.last_name,
    status: created.status,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}
