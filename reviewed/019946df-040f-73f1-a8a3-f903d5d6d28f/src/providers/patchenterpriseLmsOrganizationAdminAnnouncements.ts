import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnnouncement";
import { IPageIEnterpriseLmsAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAnnouncement";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve paginated list of announcements.
 *
 * Retrieves a filtered and paginated list of announcements within the
 * enterprise LMS scoped to the organization administrator's tenant. Supports
 * filtering by title, status, creation date range, pagination, and sorting by
 * creation date.
 *
 * @param props - Contains the authenticated organization administrator and the
 *   search criteria for announcements filtering
 * @returns Paginated list of announcements matching the search parameters
 * @throws Error if the organization administrator or tenant is not found
 */
export async function patchenterpriseLmsOrganizationAdminAnnouncements(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsAnnouncement.IRequest;
}): Promise<IPageIEnterpriseLmsAnnouncement> {
  const { organizationAdmin, body } = props;

  if (!organizationAdmin || !organizationAdmin.id) {
    throw new Error("Unauthorized: No organizationAdmin authenticated");
  }

  const adminRecord =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUnique({
      where: { id: organizationAdmin.id },
    });

  if (!adminRecord || !adminRecord.tenant_id) {
    throw new Error("Unauthorized: organization admin tenant not found");
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereCondition = {
    tenant_id: adminRecord.tenant_id,
    deleted_at: null,
    ...(body.title !== undefined && body.title !== null
      ? { title: { contains: body.title } }
      : {}),
    ...(body.status !== undefined && body.status !== null
      ? { status: body.status }
      : {}),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
            body.created_at_from !== null
              ? { gte: body.created_at_from }
              : {}),
            ...(body.created_at_to !== undefined && body.created_at_to !== null
              ? { lte: body.created_at_to }
              : {}),
          },
        }
      : {}),
  };

  const orderDirection =
    body.order === "asc" || body.order === "desc" ? body.order : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_announcements.findMany({
      where: whereCondition,
      orderBy: { created_at: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_announcements.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((r) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      creator_id: r.creator_id,
      title: r.title,
      body: r.body,
      target_audience_description:
        r.target_audience_description !== null &&
        r.target_audience_description !== undefined
          ? r.target_audience_description
          : undefined,
      status: r.status,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    })),
  };
}
