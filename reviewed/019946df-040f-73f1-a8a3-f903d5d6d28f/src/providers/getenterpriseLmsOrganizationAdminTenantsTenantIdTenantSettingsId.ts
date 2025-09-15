import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsTenantSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenantSettings";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get tenant configuration details by ID.
 *
 * Retrieves a specific tenant configuration setting for the given tenant ID and
 * setting ID. The operation is restricted to active organization administrators
 * within the tenant.
 *
 * @param props - Object containing organizationAdmin payload, tenant ID, and
 *   setting ID
 * @returns The tenant configuration setting details
 * @throws {Error} Unauthorized access or inactive organization admin
 * @throws {Error} Tenant setting not found
 */
export async function getenterpriseLmsOrganizationAdminTenantsTenantIdTenantSettingsId(props: {
  organizationAdmin: OrganizationadminPayload;
  tenantId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsTenantSettings> {
  const { organizationAdmin, tenantId, id } = props;

  // Authorization: verify organizationAdmin is active and belongs to the tenant
  const admin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findFirst({
      where: {
        id: organizationAdmin.id,
        tenant_id: tenantId,
        deleted_at: null,
        status: "active",
      },
    });

  if (!admin)
    throw new Error("Unauthorized access or inactive organization admin");

  // Retrieve the tenant setting entry
  const setting =
    await MyGlobal.prisma.enterprise_lms_tenant_settings.findFirst({
      where: {
        id,
        enterprise_lms_tenant_id: tenantId,
      },
    });

  if (!setting) throw new Error("Tenant setting not found");

  // Return with proper conversions and optional field handling
  return {
    id: setting.id,
    enterprise_lms_tenant_id: setting.enterprise_lms_tenant_id,
    branding_logo_uri: setting.branding_logo_uri ?? undefined,
    branding_color_primary: setting.branding_color_primary ?? undefined,
    branding_color_secondary: setting.branding_color_secondary ?? undefined,
    custom_domain: setting.custom_domain ?? undefined,
    css_overrides: setting.css_overrides ?? undefined,
    created_at: toISOStringSafe(setting.created_at),
    updated_at: toISOStringSafe(setting.updated_at),
  };
}
