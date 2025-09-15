import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import { IPageIEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAssessmentResult";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Retrieves a paginated list of assessment results for a specified assessment.
 *
 * This PATCH operation accepts a request body conforming to
 * IEnterpriseLmsAssessmentResult.IRequest, allowing filtering, sorting, and
 * pagination of results.
 *
 * Only assessment results matching the given assessmentId parameter are
 * returned.
 *
 * Data isolation and security for the authenticated contentCreatorInstructor
 * are enforced externally.
 *
 * @param props - Object containing authenticated contentCreatorInstructor,
 *   assessmentId path parameter, and request body with filtering and
 *   pagination.
 * @returns A paginated container of assessment results matching the criteria.
 */
export async function patchenterpriseLmsContentCreatorInstructorAssessmentsAssessmentIdResults(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsAssessmentResult.IRequest;
}): Promise<IPageIEnterpriseLmsAssessmentResult> {
  const { contentCreatorInstructor, assessmentId, body } = props;

  // Extract pagination params with default values
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Construct where clause
  const where: {
    assessment_id: string & tags.Format<"uuid">;
    deleted_at: null;
    learner_id?: string & tags.Format<"uuid">;
    status?: string;
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {
    assessment_id: assessmentId,
    deleted_at: null,
  };

  if (body.filter) {
    if (
      body.filter.learner_id !== undefined &&
      body.filter.learner_id !== null
    ) {
      where.learner_id = body.filter.learner_id;
    }
    if (body.filter.status !== undefined && body.filter.status !== null) {
      where.status = body.filter.status;
    }
    if (
      (body.filter.date_from !== undefined && body.filter.date_from !== null) ||
      (body.filter.date_to !== undefined && body.filter.date_to !== null)
    ) {
      where.created_at = {};
      if (
        body.filter.date_from !== undefined &&
        body.filter.date_from !== null
      ) {
        where.created_at.gte = body.filter.date_from;
      }
      if (body.filter.date_to !== undefined && body.filter.date_to !== null) {
        where.created_at.lte = body.filter.date_to;
      }
    }
  }

  // Determine orderBy
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort && body.sort.field) {
    const order = body.sort.order === "asc" ? "asc" : "desc";
    orderBy = { [body.sort.field]: order };
  }

  // Fetch results and count
  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_assessment_results.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_assessment_results.count({ where }),
  ]);

  // Map returned results to DTO format, converting all date fields properly
  const data = results.map((r) => ({
    id: r.id,
    assessment_id: r.assessment_id,
    learner_id: r.learner_id,
    score: r.score,
    completed_at: r.completed_at ? toISOStringSafe(r.completed_at) : null,
    status: r.status,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
    deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
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
