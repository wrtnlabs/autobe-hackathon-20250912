import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsTenantSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenantSettings";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a tenant setting for a specific tenant organization.
 *
 * This function updates branding customization fields such as logo URI, primary
 * and secondary brand colors, custom domain, and CSS overrides. It ensures that
 * the update is tenant-scoped and authorized by a system administrator.
 *
 * @param props - Properties for the operation including authorization payload,
 *   tenant ID, tenant setting ID, and the update body.
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.tenantId - UUID of the tenant organization
 * @param props.id - UUID of the tenant setting record to update
 * @param props.body - Updated tenant settings information
 * @returns The updated tenant settings record with all fields and timestamps
 * @throws Error when the tenant setting is not found for the specified tenant
 */
export async function putenterpriseLmsSystemAdminTenantsTenantIdTenantSettingsId(props: {
  systemAdmin: SystemadminPayload;
  tenantId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsTenantSettings.IUpdate;
}): Promise<IEnterpriseLmsTenantSettings> {
  const { systemAdmin, tenantId, id, body } = props;

  const existing =
    await MyGlobal.prisma.enterprise_lms_tenant_settings.findFirst({
      where: { id, enterprise_lms_tenant_id: tenantId },
    });

  if (!existing) {
    throw new Error("Tenant setting not found");
  }

  const data: Partial<IEnterpriseLmsTenantSettings.IUpdate> = {
    branding_logo_uri: body.branding_logo_uri ?? undefined,
    branding_color_primary: body.branding_color_primary ?? undefined,
    branding_color_secondary: body.branding_color_secondary ?? undefined,
    custom_domain: body.custom_domain ?? undefined,
    css_overrides: body.css_overrides ?? undefined,
    updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.enterprise_lms_tenant_settings.update({
    where: { id },
    data,
  });

  return {
    id: updated.id,
    enterprise_lms_tenant_id: updated.enterprise_lms_tenant_id,
    branding_logo_uri: updated.branding_logo_uri ?? undefined,
    branding_color_primary: updated.branding_color_primary ?? undefined,
    branding_color_secondary: updated.branding_color_secondary ?? undefined,
    custom_domain: updated.custom_domain ?? undefined,
    css_overrides: updated.css_overrides ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
