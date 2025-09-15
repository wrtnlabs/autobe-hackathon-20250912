import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { IPageIEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsBlendedLearningSession";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Search and retrieve a filtered, paginated list of blended learning sessions.
 *
 * This operation filters blended learning sessions based on session_type,
 * status, title, and scheduled start/end date ranges. Pagination and sorting
 * are supported. Tenant-level access control is enforced using the
 * contentCreatorInstructor's tenant_id.
 *
 * @param props - An object containing the authenticated
 *   contentCreatorInstructor payload and search request body with filtering,
 *   pagination, and sorting options.
 * @param props.contentCreatorInstructor - Authenticated user payload with
 *   tenant_id.
 * @param props.body - Search criteria and pagination parameters.
 * @returns A paginated summary list of blended learning sessions matching the
 *   criteria.
 * @throws {Error} When no sessions are found matching the filters.
 */
export async function patchenterpriseLmsContentCreatorInstructorBlendedLearningSessions(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  body: IEnterpriseLmsBlendedLearningSession.IRequest;
}): Promise<IPageIEnterpriseLmsBlendedLearningSession.ISummary> {
  const { contentCreatorInstructor, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build where condition
  const where: {
    tenant_id: string & tags.Format<"uuid">;
    deleted_at: null;
    session_type?: string;
    status?: string;
    title?: { contains: string };
    scheduled_start_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    scheduled_end_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {
    tenant_id: contentCreatorInstructor.id,
    deleted_at: null,
  };

  if (body.session_type !== undefined && body.session_type !== null) {
    where.session_type = body.session_type;
  }

  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }

  if (body.title !== undefined && body.title !== null) {
    where.title = { contains: body.title };
  }

  if (
    (body.scheduled_start_at_from !== undefined &&
      body.scheduled_start_at_from !== null) ||
    (body.scheduled_start_at_to !== undefined &&
      body.scheduled_start_at_to !== null)
  ) {
    where.scheduled_start_at = {};
    if (
      body.scheduled_start_at_from !== undefined &&
      body.scheduled_start_at_from !== null
    ) {
      where.scheduled_start_at.gte = body.scheduled_start_at_from;
    }
    if (
      body.scheduled_start_at_to !== undefined &&
      body.scheduled_start_at_to !== null
    ) {
      where.scheduled_start_at.lte = body.scheduled_start_at_to;
    }
  }

  if (
    (body.scheduled_end_at_from !== undefined &&
      body.scheduled_end_at_from !== null) ||
    (body.scheduled_end_at_to !== undefined &&
      body.scheduled_end_at_to !== null)
  ) {
    where.scheduled_end_at = {};
    if (
      body.scheduled_end_at_from !== undefined &&
      body.scheduled_end_at_from !== null
    ) {
      where.scheduled_end_at.gte = body.scheduled_end_at_from;
    }
    if (
      body.scheduled_end_at_to !== undefined &&
      body.scheduled_end_at_to !== null
    ) {
      where.scheduled_end_at.lte = body.scheduled_end_at_to;
    }
  }

  // Parse order_by
  let orderBy: Record<string, "asc" | "desc"> = { scheduled_start_at: "desc" };
  if (body.order_by) {
    const orderByParts = body.order_by.trim().split(/\s+/);
    const field = orderByParts[0];
    const direction =
      orderByParts.length > 1 ? orderByParts[1].toLowerCase() : "desc";
    orderBy = {
      [field]: direction === "asc" ? "asc" : "desc",
    };
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        status: true,
        scheduled_start_at: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_blended_learning_sessions.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      scheduled_start_at: toISOStringSafe(item.scheduled_start_at),
    })),
  };
}
