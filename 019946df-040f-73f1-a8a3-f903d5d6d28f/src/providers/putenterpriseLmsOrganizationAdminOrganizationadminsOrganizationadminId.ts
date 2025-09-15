import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update details of an existing organization administrator user by ID.
 *
 * This operation updates fields such as email, first name, last name, status,
 * and password hash. The tenant association (tenant_id) is immutable and cannot
 * be changed. It validates existence and email uniqueness within the tenant.
 *
 * @param props - Object containing organizationAdmin payload, target
 *   organizationadminId, and update body
 * @returns The updated organization administrator record
 * @throws {Error} When the organization administrator is not found
 * @throws {Error} When the email is already in use within the tenant
 */
export async function putenterpriseLmsOrganizationAdminOrganizationadminsOrganizationadminId(props: {
  organizationAdmin: OrganizationadminPayload;
  organizationadminId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsOrganizationAdmin.IUpdate;
}): Promise<IEnterpriseLmsOrganizationAdmin> {
  const { organizationAdmin, organizationadminId, body } = props;

  // Verify existence of the organization admin record
  const existing =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUniqueOrThrow({
      where: { id: organizationadminId },
    });

  // Validate email uniqueness if email is updated and changed
  if (body.email !== undefined && body.email !== existing.email) {
    const duplicateCount =
      await MyGlobal.prisma.enterprise_lms_organizationadmin.count({
        where: {
          email: body.email,
          tenant_id: existing.tenant_id,
          deleted_at: null,
          NOT: { id: organizationadminId },
        },
      });
    if (duplicateCount > 0) {
      throw new Error(
        `Email ${body.email} is already in use within this tenant.`,
      );
    }
  }

  // Prepare the data object for update
  const data: IEnterpriseLmsOrganizationAdmin.IUpdate = {
    email: body.email ?? undefined,
    password_hash: body.password_hash ?? undefined,
    first_name: body.first_name ?? undefined,
    last_name: body.last_name ?? undefined,
    status: body.status ?? undefined,
    deleted_at:
      body.deleted_at === undefined
        ? undefined
        : body.deleted_at === null
          ? null
          : (body.deleted_at as string & tags.Format<"date-time">),
  };

  // Perform the update
  const updated = await MyGlobal.prisma.enterprise_lms_organizationadmin.update(
    {
      where: { id: organizationadminId },
      data,
    },
  );

  // Return the updated record
  return {
    id: updated.id,
    tenant_id: updated.tenant_id,
    email: updated.email,
    password_hash: updated.password_hash,
    first_name: updated.first_name,
    last_name: updated.last_name,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
