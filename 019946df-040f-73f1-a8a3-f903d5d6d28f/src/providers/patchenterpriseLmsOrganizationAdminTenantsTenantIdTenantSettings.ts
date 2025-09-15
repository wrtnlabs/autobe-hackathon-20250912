import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsTenantSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenantSettings";
import { IPageIEnterpriseLmsTenantSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsTenantSettings";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search tenant configuration settings with pagination.
 *
 * Retrieves a paginated list of tenant configuration settings for the tenant
 * specified by tenantId. Supports filtering on branding colors, custom domain,
 * creation date, and sorting options. Accessible only by active
 * organizationAdmin users within the tenant.
 *
 * @param props - Input properties including organizationAdmin auth, tenantId,
 *   and filter/pagination request body
 * @param props.organizationAdmin - Authenticated organization admin user
 *   payload
 * @param props.tenantId - UUID of the tenant organization for filtering
 * @param props.body - Filtering and pagination parameters
 * @returns Paginated list of tenant configuration settings matching criteria
 * @throws {Error} If the organizationAdmin is not active, not part of the
 *   tenant
 */
export async function patchenterpriseLmsOrganizationAdminTenantsTenantIdTenantSettings(props: {
  organizationAdmin: OrganizationadminPayload;
  tenantId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsTenantSettings.IRequest;
}): Promise<IPageIEnterpriseLmsTenantSettings> {
  const { organizationAdmin, tenantId, body } = props;

  const adminCheck =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findFirst({
      where: {
        id: organizationAdmin.id,
        tenant_id: tenantId,
        status: "active",
        deleted_at: null,
      },
    });

  if (!adminCheck) {
    throw new Error(
      "Unauthorized: organizationAdmin not active or not part of tenant",
    );
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where: {
    enterprise_lms_tenant_id: string & tags.Format<"uuid">;
    branding_color_primary?: string;
    branding_color_secondary?: string;
    custom_domain?: string;
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {
    enterprise_lms_tenant_id: tenantId,
  };

  if (body.branding_color_primary !== undefined) {
    where.branding_color_primary = body.branding_color_primary;
  }
  if (body.branding_color_secondary !== undefined) {
    where.branding_color_secondary = body.branding_color_secondary;
  }
  if (body.custom_domain !== undefined) {
    where.custom_domain = body.custom_domain;
  }
  if (
    (body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
  ) {
    where.created_at = {};
    if (body.created_from !== undefined && body.created_from !== null) {
      where.created_at.gte = body.created_from;
    }
    if (body.created_to !== undefined && body.created_to !== null) {
      where.created_at.lte = body.created_to;
    }
  }

  const orderByField = body.order_by ?? "created_at";
  const orderByDir =
    body.order_dir === "asc" || body.order_dir === "desc"
      ? body.order_dir
      : "desc";

  const total = await MyGlobal.prisma.enterprise_lms_tenant_settings.count({
    where,
  });

  const results = await MyGlobal.prisma.enterprise_lms_tenant_settings.findMany(
    {
      where,
      orderBy: {
        [orderByField]: orderByDir,
      },
      skip,
      take: limit,
    },
  );

  const data = results.map((item) => ({
    id: item.id,
    enterprise_lms_tenant_id: item.enterprise_lms_tenant_id,
    branding_logo_uri: item.branding_logo_uri ?? null,
    branding_color_primary: item.branding_color_primary ?? null,
    branding_color_secondary: item.branding_color_secondary ?? null,
    custom_domain: item.custom_domain ?? null,
    css_overrides: item.css_overrides ?? null,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data,
  };
}
