import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessmentQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentQuestion";
import { IPageIEnterpriseLmsAssessmentQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAssessmentQuestion";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List questions for a specific assessment
 *
 * Fetch a filtered and paginated list of questions for the assessment
 * identified by assessmentId.
 *
 * Allows clients to search, sort, and paginate through questions belonging to
 * the specified assessment. Only authorized system administrators can access
 * this data.
 *
 * @param props - The request parameters including systemAdmin, assessmentId,
 *   and filtering info
 * @returns A paginated summary list of assessment questions
 * @throws {Error} Throws if database query fails or parameters are invalid
 */
export async function patchenterpriseLmsSystemAdminAssessmentsAssessmentIdQuestions(props: {
  systemAdmin: SystemadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsAssessmentQuestion.IRequest;
}): Promise<IPageIEnterpriseLmsAssessmentQuestion.ISummary> {
  const { systemAdmin, assessmentId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 100;

  // Coerce to plain numbers
  const currentPage = Number(page);
  const currentLimit = Number(limit);

  const skip = (currentPage - 1) * currentLimit;

  // Build where clause with null checks
  const where = {
    deleted_at: null,
    assessment_id: assessmentId,
    ...(body.question_type !== undefined &&
      body.question_type !== null && {
        question_type: body.question_type,
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        question_text: { contains: body.search },
      }),
  };

  // Allowed sort fields
  const allowedSortFields = ["created_at", "updated_at", "question_text"];
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };

  if (body.sort !== undefined && body.sort !== null && body.sort.length > 0) {
    const sortField = body.sort.startsWith("-")
      ? body.sort.substring(1)
      : body.sort;
    const orderDir = body.sort.startsWith("-") ? "desc" : "asc";
    if (allowedSortFields.includes(sortField)) {
      orderBy = { [sortField]: orderDir };
    }
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_assessment_questions.findMany({
      where,
      orderBy,
      skip,
      take: currentLimit,
    }),
    MyGlobal.prisma.enterprise_lms_assessment_questions.count({
      where,
    }),
  ]);

  // Map to ISummary type
  const data = rows.map((row) => ({
    id: row.id,
    question_text: row.question_text,
    question_type: row.question_type,
  }));

  return {
    pagination: {
      current: currentPage,
      limit: currentLimit,
      records: total,
      pages: Math.ceil(total / currentLimit),
    },
    data,
  };
}
