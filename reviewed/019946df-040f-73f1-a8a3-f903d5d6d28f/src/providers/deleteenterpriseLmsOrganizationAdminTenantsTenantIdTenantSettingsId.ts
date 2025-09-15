import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

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
 * Failed deletion attempts for non-existent IDs will throw an error indicating
 * not found.
 *
 * @param props - The properties including the authenticated organization
 *   administrator, tenant ID, and tenant setting ID.
 * @throws {Error} Throws 'Not Found' error if the tenant setting does not exist
 *   or does not belong to the specified tenant.
 */
export async function deleteenterpriseLmsOrganizationAdminTenantsTenantSettingsId(props: {
  organizationAdmin: OrganizationadminPayload;
  tenantId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const tenantSetting =
    await MyGlobal.prisma.enterprise_lms_tenant_settings.findUniqueOrThrow({
      where: { id: props.id },
    });

  if (tenantSetting.enterprise_lms_tenant_id !== props.tenantId) {
    throw new Error("Not Found");
  }

  await MyGlobal.prisma.enterprise_lms_tenant_settings.delete({
    where: { id: props.id },
  });
}
