import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { IPageIEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsBlendedLearningSession";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Searches and retrieves a filtered, paginated list of blended learning
 * sessions belonging to the tenant of the authenticated organization
 * administrator.
 *
 * Filters include session_type, status, title substring search, and date range
 * filters on scheduled start and end timestamps. Pagination is supported with
 * default page 1 and limit 10 if not specified. Sorting by scheduled_start_at
 * ascending or descending is supported.
 *
 * Authorization is enforced by restricting queries to the tenant_id of the
 * authenticated organizationAdmin. Soft-deleted sessions (deleted_at NOT null)
 * are excluded.
 *
 * @param props - Object containing organizationAdmin payload and search
 *   criteria body.
 * @param props.organizationAdmin - Authenticated organization administrator
 *   payload with tenant ID.
 * @param props.body - Search and pagination filters as specified in
 *   IEnterpriseLmsBlendedLearningSession.IRequest.
 * @returns Paginated summary list of blended learning sessions.
 * @throws {Error} Throws if any database error occurs.
 */
export async function patchenterpriseLmsOrganizationAdminBlendedLearningSessions(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsBlendedLearningSession.IRequest;
}): Promise<IPageIEnterpriseLmsBlendedLearningSession.ISummary> {
  const { organizationAdmin, body } = props;

  const tenantId = organizationAdmin.id; // tenant id is guaranteed by organizationAdmin

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const whereConditions: Record<string, unknown> = {
    tenant_id: tenantId,
    deleted_at: null,
    ...(body.session_type !== undefined &&
      body.session_type !== null && { session_type: body.session_type }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.title !== undefined &&
      body.title !== null && { title: { contains: body.title } }),
  };

  if (
    (body.scheduled_start_at_from !== undefined &&
      body.scheduled_start_at_from !== null) ||
    (body.scheduled_start_at_to !== undefined &&
      body.scheduled_start_at_to !== null)
  ) {
    whereConditions.scheduled_start_at = {
      ...(body.scheduled_start_at_from !== undefined &&
        body.scheduled_start_at_from !== null && {
          gte: body.scheduled_start_at_from,
        }),
      ...(body.scheduled_start_at_to !== undefined &&
        body.scheduled_start_at_to !== null && {
          lte: body.scheduled_start_at_to,
        }),
    };
  }

  if (
    (body.scheduled_end_at_from !== undefined &&
      body.scheduled_end_at_from !== null) ||
    (body.scheduled_end_at_to !== undefined &&
      body.scheduled_end_at_to !== null)
  ) {
    whereConditions.scheduled_end_at = {
      ...(body.scheduled_end_at_from !== undefined &&
        body.scheduled_end_at_from !== null && {
          gte: body.scheduled_end_at_from,
        }),
      ...(body.scheduled_end_at_to !== undefined &&
        body.scheduled_end_at_to !== null && { lte: body.scheduled_end_at_to }),
    };
  }

  const total =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.count({
      where: whereConditions,
    });

  const sessions =
    await MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findMany({
      where: whereConditions,
      orderBy:
        body.order_by === "scheduled_start_at_asc"
          ? { scheduled_start_at: "asc" }
          : { scheduled_start_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        status: true,
        scheduled_start_at: true,
      },
    });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: sessions.map((session) => ({
      id: session.id as string & tags.Format<"uuid">,
      title: session.title,
      status: session.status,
      scheduled_start_at: toISOStringSafe(session.scheduled_start_at),
    })),
  };
}
