import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { IPageIEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsProctoredExam";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a paginated list of proctored exams for a given
 * assessment.
 *
 * This operation fetches proctored exam sessions filtered by assessmentId and
 * optional search parameters such as exam session ID or proctor ID. It supports
 * pagination and sorting by specified fields.
 *
 * Only accessible by systemAdmin role users.
 *
 * @param props - The request properties including authenticated systemAdmin,
 *   path assessmentId, and request body with filtering and pagination options.
 * @returns Paginated list of proctored exams matching the criteria.
 * @throws Error if database query fails or invalid parameters are provided.
 */
export async function patchenterpriseLmsSystemAdminAssessmentsAssessmentIdProctoredExams(props: {
  systemAdmin: SystemadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.IRequest;
}): Promise<IPageIEnterpriseLmsProctoredExam> {
  const { systemAdmin, assessmentId, body } = props;

  // Normalize pagination parameters with defaults
  const page = (body.page ?? 1) as number & tags.Type<"int32"> as number;
  const limit = (body.limit ?? 10) as number & tags.Type<"int32"> as number;
  const skip = (page - 1) * limit;

  // Parse orderBy string: format expected "field direction"
  let orderByField = "created_at";
  let orderByDirection: "asc" | "desc" = "desc";
  if (body.orderBy) {
    const parts = body.orderBy.trim().split(/\s+/);
    if (parts.length === 2) {
      const [field, dir] = parts;
      const dirLower = dir.toLowerCase();
      if (
        (dirLower === "asc" || dirLower === "desc") &&
        [
          "id",
          "assessment_id",
          "exam_session_id",
          "proctor_id",
          "scheduled_at",
          "status",
          "created_at",
          "updated_at",
          "deleted_at",
        ].includes(field)
      ) {
        orderByField = field;
        orderByDirection = dirLower as "asc" | "desc";
      }
    }
  }

  // Build where clause
  const where: {
    assessment_id: string & tags.Format<"uuid">;
    deleted_at?: null;
    status?: "scheduled" | "in_progress" | "completed" | "cancelled";
    OR?:
      | {
          exam_session_id?: { contains: string };
        }
      | {
          proctor_id?: { contains: string };
        }[];
  } = {
    assessment_id: assessmentId,
    deleted_at: null,
  };

  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }

  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.length > 0
  ) {
    where.OR = [
      { exam_session_id: { contains: body.search } },
      { proctor_id: { contains: body.search } },
    ];
  }

  // Execute queries in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_proctored_exams.findMany({
      where,
      orderBy: { [orderByField]: orderByDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_proctored_exams.count({
      where,
    }),
  ]);

  // Map database rows to DTO with proper date formatting
  const data = rows.map((exam) => ({
    id: exam.id as string & tags.Format<"uuid">,
    assessment_id: exam.assessment_id as string & tags.Format<"uuid">,
    exam_session_id: exam.exam_session_id,
    proctor_id: exam.proctor_id ?? undefined,
    scheduled_at: toISOStringSafe(exam.scheduled_at),
    status: exam.status as
      | "scheduled"
      | "in_progress"
      | "completed"
      | "cancelled",
    created_at: toISOStringSafe(exam.created_at),
    updated_at: toISOStringSafe(exam.updated_at),
    deleted_at: exam.deleted_at ? toISOStringSafe(exam.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
