import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update tenant information
 *
 * Updates the tenant organization details identified by the given UUID. Only
 * system administrators are authorized to perform this operation.
 *
 * @param props - Input properties including systemAdmin payload, tenant ID, and
 *   update body
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.id - The UUID of the tenant to update
 * @param props.body - Partial update fields for the tenant
 * @returns Updated tenant information with all relevant fields
 * @throws {Error} When the tenant does not exist
 */
export async function putenterpriseLmsSystemAdminTenantsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsTenant.IUpdate;
}): Promise<IEnterpriseLmsTenant> {
  const { systemAdmin, id, body } = props;

  // Verify existence of tenant
  const tenant = await MyGlobal.prisma.enterprise_lms_tenants.findUnique({
    where: { id },
  });
  if (!tenant) throw new Error("Tenant not found");

  // Update with fields present in body
  const updated = await MyGlobal.prisma.enterprise_lms_tenants.update({
    where: { id },
    data: {
      ...(body.code !== undefined && { code: body.code }),
      ...(body.name !== undefined && { name: body.name }),
      ...(body.deleted_at !== undefined && { deleted_at: body.deleted_at }),
    },
  });

  // Return updated tenant with ISO string conversion for date fields
  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
