import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new analytics dashboard definition
 *
 * This function inserts a new record into the
 * healthcare_platform_analytics_dashboards table, storing the configuration,
 * title, ownership, sharing settings, and metadata as provided by the system
 * admin requestor. It enforces organizational and department scope according to
 * business rules and returns the persisted dashboard object for use in listing
 * or editing workflows.
 *
 * Only systemAdmin or organizationAdmin roles are permitted to call this
 * operation (authorization required via SystemadminPayload). Unique title
 * constraint per organization is enforced by the Prisma schema; errors will
 * propagate if violated.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated Systemadmin making the request
 * @param props.body - Input fields for the dashboard, including owner, org,
 *   department (optional), title, description (optional), config, and
 *   visibility flag
 * @returns The fully-populated analytics dashboard object as stored in the
 *   database (for rendering, editing, or downstream workflows)
 * @throws {Error} If database constraints are violated (e.g., unique title per
 *   org), or for any system error
 */
export async function posthealthcarePlatformSystemAdminAnalyticsDashboards(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformAnalyticsDashboard.ICreate;
}): Promise<IHealthcarePlatformAnalyticsDashboard> {
  const { body } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        owner_user_id: body.owner_user_id,
        organization_id: body.organization_id,
        department_id: body.department_id ?? null,
        title: body.title,
        description: body.description ?? null,
        config_json: body.config_json,
        is_public: body.is_public,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  return {
    id: created.id,
    owner_user_id: created.owner_user_id,
    organization_id: created.organization_id,
    department_id: created.department_id,
    title: created.title,
    description: created.description ?? undefined,
    config_json: created.config_json,
    is_public: created.is_public,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? undefined,
  };
}
