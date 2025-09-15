import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { IPageIEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsBlendedLearningSession";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieves filtered and paginated blended learning sessions.
 *
 * Supports filtering by session type, title, status, scheduled start and end
 * ranges. Pagination and sorting are supported with proper bounds and
 * defaults.
 *
 * Requires systemAdmin authorization.
 *
 * @param props - Object containing the authenticated systemAdmin and the
 *   request body
 * @returns Paginated summary list of blended learning sessions
 * @throws Error if pagination parameters are invalid
 */
export async function patchenterpriseLmsSystemAdminBlendedLearningSessions(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsBlendedLearningSession.IRequest;
}): Promise<IPageIEnterpriseLmsBlendedLearningSession.ISummary> {
  const { body } = props;

  // Validate and normalize page and limit
  if (body.page !== undefined && body.page !== null && body.page <= 0) {
    throw new Error("Invalid page number, must be positive");
  }
  if (
    body.limit !== undefined &&
    body.limit !== null &&
    (body.limit <= 0 || body.limit > 100)
  ) {
    throw new Error("Limit must be between 1 and 100");
  }

  const page = (body.page && body.page > 0 ? body.page : 1) as number &
    tags.Type<"int32">;
  const limit = (
    body.limit && body.limit > 0 && body.limit <= 100 ? body.limit : 10
  ) as number & tags.Type<"int32">;

  // Build where clause
  const where: any = {
    deleted_at: null,
  };

  if (body.session_type !== undefined && body.session_type !== null) {
    where.session_type = body.session_type;
  }

  if (body.title !== undefined && body.title !== null) {
    where.title = { contains: body.title };
  }

  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
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

  // Parse order_by string
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };

  if (
    body.order_by !== undefined &&
    body.order_by !== null &&
    body.order_by.trim() !== ""
  ) {
    const parts = body.order_by.trim().split(/\s+/);
    if (parts.length === 2) {
      const [field, direction] = parts;
      const dir = direction.toLowerCase();
      if (
        (dir === "asc" || dir === "desc") &&
        [
          "scheduled_start_at",
          "scheduled_end_at",
          "created_at",
          "updated_at",
        ].includes(field)
      ) {
        orderBy = {};
        orderBy[field] = dir as "asc" | "desc";
      }
    }
  }

  const skip = (page - 1) * limit;

  // Query data and total count concurrently
  const [sessions, total] = await Promise.all([
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

  // Map results to ISummary with date conversion
  const data = sessions.map((session) => ({
    id: session.id as string & tags.Format<"uuid">,
    title: session.title,
    status: session.status,
    scheduled_start_at: toISOStringSafe(session.scheduled_start_at),
  }));

  // Prepare and return pagination info
  return {
    pagination: {
      current: Number(page) as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: Number(limit) as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
