import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { IPageIEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsProctoredExam";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Search and retrieve a paginated list of proctored exams for a given
 * assessment.
 *
 * This operation filters proctored exams by assessment ID, with optional
 * search, status filtering, pagination, and sorting. Soft-deleted records are
 * excluded.
 *
 * @param props - The function parameters.
 * @param props.guest - The authenticated guest user payload.
 * @param props.assessmentId - UUID string identifying the target assessment.
 * @param props.body - Request body with search, pagination, and filter options.
 * @returns A paginated list of proctored exam records matching the criteria.
 * @throws {Error} When the operation encounters errors, including database
 *   access issues.
 */
export async function patchenterpriseLmsGuestAssessmentsAssessmentIdProctoredExams(props: {
  guest: GuestPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.IRequest;
}): Promise<IPageIEnterpriseLmsProctoredExam> {
  const { guest, assessmentId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    assessment_id: assessmentId,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.search !== undefined &&
      body.search !== null &&
      typeof body.search === "string" && {
        exam_session_id: { contains: body.search },
      }),
  };

  const orderByParts = (body.orderBy ?? "created_at desc").split(/\s+/);
  const orderField = orderByParts[0] || "created_at";
  const orderDirection =
    (orderByParts[1] || "desc").toLowerCase() === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_proctored_exams.findMany({
      where,
      orderBy: { [orderField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_proctored_exams.count({ where }),
  ]);

  const data = rows.map((exam) => ({
    ...exam,
    scheduled_at: toISOStringSafe(exam.scheduled_at),
    created_at: toISOStringSafe(exam.created_at),
    updated_at: toISOStringSafe(exam.updated_at),
    proctor_id: exam.proctor_id ?? undefined,
    deleted_at: exam.deleted_at ? toISOStringSafe(exam.deleted_at) : undefined,
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
