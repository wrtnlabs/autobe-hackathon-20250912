import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsTenantSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenantSettings";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new tenant configuration setting record.
 *
 * This operation creates tenant-specific configuration including branding logo,
 * colors, custom domain, and CSS overrides for the given tenant. Requires
 * organization administrator authentication.
 *
 * @param props - Object containing the organizationAdmin payload, tenantId, and
 *   create body
 * @param props.organizationAdmin - Authenticated organization administrator
 *   payload
 * @param props.tenantId - UUID of the tenant for which to create settings
 * @param props.body - Tenant settings creation data
 * @returns The newly created tenant setting object
 * @throws {Error} If tenantId in path and body do not match
 */
export async function postenterpriseLmsOrganizationAdminTenantsTenantIdTenantSettings(props: {
  organizationAdmin: OrganizationadminPayload;
  tenantId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsTenantSettings.ICreate;
}): Promise<IEnterpriseLmsTenantSettings> {
  const { organizationAdmin, tenantId, body } = props;

  if (body.enterprise_lms_tenant_id !== tenantId) {
    throw new Error("Tenant ID in path and body do not match");
  }

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.enterprise_lms_tenant_settings.create({
    data: {
      id,
      enterprise_lms_tenant_id: body.enterprise_lms_tenant_id,
      branding_logo_uri: body.branding_logo_uri ?? null,
      branding_color_primary: body.branding_color_primary ?? null,
      branding_color_secondary: body.branding_color_secondary ?? null,
      custom_domain: body.custom_domain ?? null,
      css_overrides: body.css_overrides ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    enterprise_lms_tenant_id: created.enterprise_lms_tenant_id,
    branding_logo_uri: created.branding_logo_uri ?? null,
    branding_color_primary: created.branding_color_primary ?? null,
    branding_color_secondary: created.branding_color_secondary ?? null,
    custom_domain: created.custom_domain ?? null,
    css_overrides: created.css_overrides ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
