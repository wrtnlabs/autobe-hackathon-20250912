import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicationFeedback } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationFeedback";
import { IPageIAtsRecruitmentApplicationFeedback } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentApplicationFeedback";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function patchatsRecruitmentSystemAdminApplicationsApplicationIdFeedback(props: {
  systemAdmin: SystemadminPayload;
  applicationId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentApplicationFeedback.IRequest;
}): Promise<IPageIAtsRecruitmentApplicationFeedback> {
  const { applicationId, body } = props;

  // Defaults for pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Sorting
  const sortOrder = body.sort === "asc" ? "asc" : "desc";

  // Build filters
  // Rating filter (gte/lte combined if both present)
  let ratingFilter: { gte?: number; lte?: number } = {};
  if (body.rating_min !== undefined) {
    ratingFilter.gte = body.rating_min;
  }
  if (body.rating_max !== undefined) {
    ratingFilter.lte = body.rating_max;
  }
  // created_at filter (gte/lte combined if both present)
  let dateFilter: { gte?: string; lte?: string } = {};
  if (body.created_at_from !== undefined && body.created_at_from !== null) {
    dateFilter.gte = body.created_at_from;
  }
  if (body.created_at_to !== undefined && body.created_at_to !== null) {
    dateFilter.lte = body.created_at_to;
  }

  // Compose where clause
  const where = {
    application_id: applicationId,
    ...(body.reviewer_id !== undefined &&
      body.reviewer_id !== null && { reviewer_id: body.reviewer_id }),
    ...(body.is_final_recommendation !== undefined && {
      is_final_recommendation: body.is_final_recommendation,
    }),
    ...ratingFilter,
    ...dateFilter,
  };

  // Query
  const [feedbackRows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_application_feedback.findMany({
      where,
      orderBy: { created_at: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_application_feedback.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: feedbackRows.map((row) => {
      const result = {
        id: row.id,
        application_id: row.application_id,
        reviewer_id: row.reviewer_id,
        feedback_body: row.feedback_body,
        is_final_recommendation: row.is_final_recommendation,
        created_at: toISOStringSafe(row.created_at),
      };
      if (row.rating !== null && row.rating !== undefined) {
        return {
          ...result,
          rating: row.rating,
        };
      }
      return result;
    }),
  };
}
