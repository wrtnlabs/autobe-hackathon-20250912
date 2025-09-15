import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete a tenant setting by ID for a specific tenant organization.
 *
 * This operation performs a hard delete, completely removing the tenant setting
 * record from the database. It is irreversible and will cause all associated
 * branding and customization data for this setting to be lost.
 *
 * Access is strictly limited to system administrators and tenants' organization
 * administrators with permissions to manage tenant settings.
 *
 * Failed deletion attempts for non-existent IDs will return an error.
 *
 * @param props - Object containing systemAdmin authentication, tenantId and
 *   tenantSetting id
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the deletion
 * @param props.tenantId - Unique identifier of the tenant organization
 * @param props.id - Unique identifier of the tenant setting to delete
 * @throws {Error} When tenant setting is not found for given tenantId and id
 */
export async function deleteenterpriseLmsSystemAdminTenantsTenantIdTenantSettingsId(props: {
  systemAdmin: SystemadminPayload;
  tenantId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, tenantId, id } = props;

  const tenantSetting =
    await MyGlobal.prisma.enterprise_lms_tenant_settings.findFirst({
      where: {
        id,
        enterprise_lms_tenant_id: tenantId,
      },
    });

  if (!tenantSetting) {
    throw new Error("Tenant setting not found");
  }

  await MyGlobal.prisma.enterprise_lms_tenant_settings.delete({
    where: {
      id,
    },
  });
}
