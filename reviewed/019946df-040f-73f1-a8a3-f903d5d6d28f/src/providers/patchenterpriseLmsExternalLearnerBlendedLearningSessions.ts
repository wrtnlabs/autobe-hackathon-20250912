import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { IPageIEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsBlendedLearningSession";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Search and retrieve a filtered, paginated list of blended learning sessions.
 *
 * This operation filters blended learning sessions by tenant, session type,
 * status, scheduled time ranges, and handles pagination with sorting.
 *
 * Only sessions not soft-deleted and belonging to the external learner's tenant
 * are returned.
 *
 * @param props - An object containing the external learner payload and filter
 *   criteria.
 * @param props.externalLearner - The authenticated external learner user with
 *   tenant scope.
 * @param props.body - The filter criteria and pagination parameters.
 * @returns A paginated summary list of blended learning sessions matching the
 *   filters.
 * @throws {Error} If any uncaught error occurs during database retrieval.
 */
export async function patchenterpriseLmsExternalLearnerBlendedLearningSessions(props: {
  externalLearner: ExternallearnerPayload;
  body: IEnterpriseLmsBlendedLearningSession.IRequest;
}): Promise<IPageIEnterpriseLmsBlendedLearningSession.ISummary> {
  const { externalLearner, body } = props;

  const page = body.page ?? 0;
  const limit = body.limit ?? 10;

  // Build the where filter with tenant scope and soft delete
  const where: {
    tenant_id: string & tags.Format<"uuid">;
    deleted_at: null;
    session_type?: string;
    status?: string;
    scheduled_start_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    scheduled_end_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {
    tenant_id: externalLearner.id,
    deleted_at: null,
  };

  if (body.session_type !== undefined && body.session_type !== null) {
    where.session_type = body.session_type;
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

  // Calculate skip
  const skip = page * limit;

  // Determine order field and direction
  let orderBy: Record<string, "asc" | "desc"> = { scheduled_start_at: "desc" };
  if (typeof body.order_by === "string" && body.order_by.trim().length > 0) {
    let orderField = body.order_by.trim();
    let orderDirection: "asc" | "desc" = "asc";
    if (orderField.startsWith("-")) {
      orderField = orderField.slice(1);
      orderDirection = "desc";
    }

    const allowedOrderFields = new Set([
      "scheduled_start_at",
      "created_at",
      "updated_at",
      "title",
    ]);
    if (allowedOrderFields.has(orderField)) {
      orderBy = { [orderField]: orderDirection };
    }
  }

  // Retrieve data and total count
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        scheduled_start_at: true,
      },
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_blended_learning_sessions.count({ where }),
  ]);

  // Map results to summary DTO with proper date string conversion
  const data = sessions.map((session) => ({
    id: session.id as string & tags.Format<"uuid">,
    title: session.title,
    status: session.status,
    scheduled_start_at: toISOStringSafe(session.scheduled_start_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
