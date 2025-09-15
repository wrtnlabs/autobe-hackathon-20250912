import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsTenantSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenantSettings";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing tenant setting for a given tenant organization.
 *
 * This operation updates branding and customization settings for a tenant,
 * ensuring the organization administrator is authorized and the tenant setting
 * exists within the specified tenant context.
 *
 * @param props - Parameters including authorized organization admin, tenant ID,
 *   tenant setting ID, and tenant settings update body.
 * @returns The updated tenant settings record with properly formatted
 *   timestamps.
 * @throws {Error} When the admin is unauthorized or the tenant setting does not
 *   exist.
 */
export async function putenterpriseLmsOrganizationAdminTenantsTenantIdTenantSettingsId(props: {
  organizationAdmin: OrganizationadminPayload;
  tenantId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsTenantSettings.IUpdate;
}): Promise<IEnterpriseLmsTenantSettings> {
  const { organizationAdmin, tenantId, id, body } = props;

  // Verify the organization admin's access
  const admin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findFirst({
      where: {
        id: organizationAdmin.id,
        tenant_id: tenantId,
        deleted_at: null,
        status: "active",
      },
    });

  if (!admin) {
    throw new Error(
      "Unauthorized: organizationAdmin does not have access to this tenant",
    );
  }

  // Verify existence of tenant setting
  const existingSetting =
    await MyGlobal.prisma.enterprise_lms_tenant_settings.findFirst({
      where: {
        id,
        enterprise_lms_tenant_id: tenantId,
      },
    });

  if (!existingSetting) {
    throw new Error("Tenant setting not found");
  }

  // Prepare the update data with optional and nullable fields
  const now = toISOStringSafe(new Date());

  const updateData = {
    branding_logo_uri: body.branding_logo_uri ?? undefined,
    branding_color_primary: body.branding_color_primary ?? undefined,
    branding_color_secondary: body.branding_color_secondary ?? undefined,
    custom_domain: body.custom_domain ?? undefined,
    css_overrides: body.css_overrides ?? undefined,
    updated_at: now,
  };

  // Execute the update operation
  const updated = await MyGlobal.prisma.enterprise_lms_tenant_settings.update({
    where: { id },
    data: updateData,
  });

  // Return the updated tenant setting with properly formatted dates
  return {
    id: updated.id,
    enterprise_lms_tenant_id: updated.enterprise_lms_tenant_id,
    branding_logo_uri:
      updated.branding_logo_uri === null
        ? null
        : (updated.branding_logo_uri ?? undefined),
    branding_color_primary:
      updated.branding_color_primary === null
        ? null
        : (updated.branding_color_primary ?? undefined),
    branding_color_secondary:
      updated.branding_color_secondary === null
        ? null
        : (updated.branding_color_secondary ?? undefined),
    custom_domain:
      updated.custom_domain === null
        ? null
        : (updated.custom_domain ?? undefined),
    css_overrides:
      updated.css_overrides === null
        ? null
        : (updated.css_overrides ?? undefined),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
