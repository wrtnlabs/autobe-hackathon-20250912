import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { IPageIEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsBlendedLearningSession";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Search and retrieve a filtered, paginated list of blended learning sessions.
 *
 * This function fetches blended learning sessions related to the corporate
 * learner's tenant, applying search criteria such as session type, title,
 * status, scheduled date ranges, pagination, and sorting.
 *
 * @param props - The input properties including corporate learner payload and
 *   search criteria body
 * @returns A paginated summary listing of blended learning sessions matching
 *   the criteria
 * @throws Error if any unexpected database issues occur
 */
export async function patchenterpriseLmsCorporateLearnerBlendedLearningSessions(props: {
  corporateLearner: CorporatelearnerPayload;
  body: IEnterpriseLmsBlendedLearningSession.IRequest;
}): Promise<IPageIEnterpriseLmsBlendedLearningSession.ISummary> {
  const { corporateLearner, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    tenant_id: corporateLearner.id,
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

  const validOrderFields = [
    "session_type",
    "title",
    "status",
    "scheduled_start_at",
    "scheduled_end_at",
    "created_at",
  ];

  let orderBy: Record<string, "asc" | "desc"> | undefined;
  if (body.order_by && typeof body.order_by === "string") {
    const orderField = body.order_by.startsWith("-")
      ? body.order_by.substring(1)
      : body.order_by;
    const orderDirection = body.order_by.startsWith("-") ? "desc" : "asc";
    if (validOrderFields.includes(orderField)) {
      orderBy = { [orderField]: orderDirection };
    }
  }

  if (!orderBy) {
    orderBy = { scheduled_start_at: "desc" };
  }

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
        session_type: true,
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
    data: sessions.map((session) => ({
      id: session.id,
      title: session.title,
      status: session.status,
      session_type: session.session_type,
      scheduled_start_at: toISOStringSafe(session.scheduled_start_at),
    })),
  };
}
