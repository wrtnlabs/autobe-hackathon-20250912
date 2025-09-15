import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import { IPageIEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsBlendedLearningSession";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Search and retrieve a filtered, paginated list of blended learning sessions.
 *
 * This operation filters sessions by tenant, session type, title, status, and
 * scheduled time ranges. It enforces role-based access, paginates results, and
 * returns summarized session data.
 *
 * @param props - Object containing the departmentManager payload and request
 *   body
 * @param props.departmentManager - The authenticated department manager user
 * @param props.body - Filter and pagination criteria for blended learning
 *   sessions
 * @returns Paginated summary of blended learning sessions matching criteria
 * @throws {Error} When authorization is missing or invalid
 */
export async function patchenterpriseLmsDepartmentManagerBlendedLearningSessions(props: {
  departmentManager: DepartmentmanagerPayload;
  body: IEnterpriseLmsBlendedLearningSession.IRequest;
}): Promise<IPageIEnterpriseLmsBlendedLearningSession.ISummary> {
  const { departmentManager, body } = props;

  // Validate tenant_id from departmentManager
  // Correction: departmentManager has 'id' as user id, must use it to query tenant_id via prisma
  const systemDeptManager =
    await MyGlobal.prisma.enterprise_lms_departmentmanager.findUnique({
      where: { id: departmentManager.id },
      select: { tenant_id: true },
    });

  if (!systemDeptManager || !systemDeptManager.tenant_id) {
    throw new Error(
      "Unauthorized: Department manager has no tenant association",
    );
  }

  const tenantId = systemDeptManager.tenant_id;

  // Prepare pagination parameters
  const page = body.page ?? (1 as number & tags.Type<"int32">);
  const limit = body.limit ?? (10 as number & tags.Type<"int32">);

  // Build filter object
  const where: any = {
    tenant_id: tenantId,
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

  // Determine order by
  // Allowed fields: 'session_type', 'title', 'status', 'scheduled_start_at', 'scheduled_end_at'
  let orderByField: string = "scheduled_start_at";
  let orderByDirection: "asc" | "desc" = "desc";
  if (
    body.order_by !== undefined &&
    body.order_by !== null &&
    body.order_by.length > 0
  ) {
    const trimmed = body.order_by.trim();
    if (trimmed.startsWith("-")) {
      orderByField = trimmed.substring(1);
      orderByDirection = "desc";
    } else if (trimmed.startsWith("+")) {
      orderByField = trimmed.substring(1);
      orderByDirection = "asc";
    } else {
      orderByField = trimmed;
      orderByDirection = "asc";
    }

    // Validate allowed fields
    const allowedSortFields = [
      "session_type",
      "title",
      "status",
      "scheduled_start_at",
      "scheduled_end_at",
    ];
    if (!allowedSortFields.includes(orderByField)) {
      orderByField = "scheduled_start_at";
      orderByDirection = "desc";
    }
  }

  const skip = (page - 1) * limit;

  // Query db
  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_blended_learning_sessions.findMany({
      where,
      orderBy: { [orderByField]: orderByDirection },
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

  // Map to ISummary response type with proper branding
  const data: IPageIEnterpriseLmsBlendedLearningSession.ISummary["data"] =
    results.map((session) => ({
      id: session.id as string & tags.Format<"uuid">,
      title: session.title,
      status: session.status,
      session_type: session.session_type,
      scheduled_start_at: session.scheduled_start_at as string &
        tags.Format<"date-time">,
    }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
