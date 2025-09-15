import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessmentQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentQuestion";
import { IPageIEnterpriseLmsAssessmentQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAssessmentQuestion";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * List questions for a specific assessment.
 *
 * Retrieves a paginated and filtered list of questions associated with the
 * specified assessment ID. Supports filtering by question type and search
 * keyword in question text, as well as sorting and pagination.
 *
 * @param props - Object containing the authenticated organization admin,
 *   assessment ID, and request body with filters and pagination.
 * @returns Paginated summary of assessment questions matching the criteria.
 */
export async function patchenterpriseLmsOrganizationAdminAssessmentsAssessmentIdQuestions(props: {
  organizationAdmin: OrganizationadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsAssessmentQuestion.IRequest;
}): Promise<IPageIEnterpriseLmsAssessmentQuestion.ISummary> {
  const { organizationAdmin, assessmentId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where = {
    assessment_id: assessmentId,
    deleted_at: null,
    ...(body.question_type !== undefined &&
      body.question_type !== null && {
        question_type: body.question_type,
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        question_text: {
          contains: body.search,
        },
      }),
  };

  const [questions, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_assessment_questions.findMany({
      where,
      select: {
        id: true,
        question_text: true,
        question_type: true,
      },
      skip,
      take: limit,
      orderBy:
        body.sort && body.sort.toLowerCase() === "question_text"
          ? { question_text: "asc" }
          : { created_at: "desc" },
    }),

    MyGlobal.prisma.enterprise_lms_assessment_questions.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: questions.map((q) => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
    })),
  };
}
