import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { IPageIEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsProctoredExam";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Search and retrieve a paginated list of proctored exams for a given
 * assessment.
 *
 * This endpoint enables department managers to query proctored exam sessions
 * linked to a specific assessment within the Enterprise LMS. Supports filtering
 * by status, partial search on exam session identifiers, sorting by specified
 * fields, and pagination.
 *
 * @param props - Object containing departmentManager authentication,
 *   assessmentId path parameter, and filtering pagination options in body.
 * @param props.departmentManager - Authenticated department manager payload
 *   with user identity.
 * @param props.assessmentId - UUID string of the target assessment.
 * @param props.body - Search and pagination criteria conforming to
 *   IEnterpriseLmsProctoredExam.IRequest.
 * @returns Paginated list of proctored exam records matching the criteria.
 * @throws {Error} Throws if unexpected errors occur during DB operations.
 */
export async function patchenterpriseLmsDepartmentManagerAssessmentsAssessmentIdProctoredExams(props: {
  departmentManager: DepartmentmanagerPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.IRequest;
}): Promise<IPageIEnterpriseLmsProctoredExam> {
  const { departmentManager, assessmentId, body } = props;

  // Normalize pagination parameters
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Construct filtering conditions
  const where = {
    assessment_id: assessmentId,
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.search !== undefined &&
      body.search !== null && { exam_session_id: { contains: body.search } }),
  };

  // Parse orderBy string to Prisma orderBy object
  const orderBy = body.orderBy
    ? (() => {
        const parts = body.orderBy.split(" ");
        const field = parts[0];
        const order = parts.length > 1 ? parts[1] : "asc";
        return { [field]: order.toLowerCase() === "desc" ? "desc" : "asc" };
      })()
    : { created_at: "desc" };

  // Execute queries concurrently
  const [records, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_proctored_exams.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_proctored_exams.count({ where }),
  ]);

  // Map results converting Date fields to ISO strings
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      assessment_id: record.assessment_id,
      exam_session_id: record.exam_session_id,
      proctor_id: record.proctor_id ?? undefined,
      scheduled_at: toISOStringSafe(record.scheduled_at),
      status: record.status as "the four allowed status",
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    })),
  };
}
