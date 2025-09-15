import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import { IPageIAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterview";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a paginated and filtered list of interviews
 * (ats_recruitment_interviews table) by status, stage, time, and participants.
 *
 * Enables users such as HR recruiters and system admins to retrieve a list of
 * interview sessions from the recruitment system. Supports advanced
 * search/filter by applicant, recruiter, interview stage, interview status, and
 * scheduled date ranges, supporting ATS workflow management and analytics.
 *
 * Paging and sorting is implemented for performance and usability, and security
 * checks ensure that only authorized users may access this information. The
 * operation links to interview participants to help identify roles per
 * interview. Errors are handled to clarify cases where filters are invalid or
 * access is not authorized. This power search is essential for daily ATS
 * interview logistics, compliance, and reporting.
 *
 * @param props -
 *
 *   - SystemAdmin: The authenticated system admin making the request
 *   - Body: IAtsRecruitmentInterview.IRequest search criteria and paging
 *
 * @returns Paginated and filtered list result containing interview summaries
 *   required for interview management screens.
 * @throws {Error} If a database or logic error occurs or system admin is not
 *   authorized.
 */
export async function patchatsRecruitmentSystemAdminInterviews(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentInterview.IRequest;
}): Promise<IPageIAtsRecruitmentInterview.ISummary> {
  const { body } = props;
  // Default/normalize pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const numericPage = Number(page);
  const numericLimit = Number(limit);

  // Participant-based filtering
  let interviewIds: string[] | undefined = undefined;
  if (
    (body.applicant_id !== undefined && body.applicant_id !== null) ||
    (body.hr_recruiter_id !== undefined && body.hr_recruiter_id !== null) ||
    (body.tech_reviewer_id !== undefined && body.tech_reviewer_id !== null)
  ) {
    const participantRows =
      await MyGlobal.prisma.ats_recruitment_interview_participants.findMany({
        where: {
          ...(body.applicant_id !== undefined &&
            body.applicant_id !== null && {
              ats_recruitment_applicant_id: body.applicant_id,
            }),
          ...(body.hr_recruiter_id !== undefined &&
            body.hr_recruiter_id !== null && {
              ats_recruitment_hrrecruiter_id: body.hr_recruiter_id,
            }),
          ...(body.tech_reviewer_id !== undefined &&
            body.tech_reviewer_id !== null && {
              ats_recruitment_techreviewer_id: body.tech_reviewer_id,
            }),
        },
        select: { ats_recruitment_interview_id: true },
      });
    interviewIds = participantRows.map((p) => p.ats_recruitment_interview_id);
    if (interviewIds.length === 0) {
      return {
        pagination: {
          current: numericPage,
          limit: numericLimit,
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
  }

  // Compose interview filter
  const interviewWhere = {
    deleted_at: null,
    ...(interviewIds && { id: { in: interviewIds } }),
    ...(body.stage !== undefined &&
      body.stage !== null && { stage: body.stage }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.created_from !== undefined &&
      body.created_from !== null && {
        created_at: { gte: body.created_from },
      }),
    ...(body.created_to !== undefined &&
      body.created_to !== null && {
        created_at: { lte: body.created_to },
      }),
    // No start_at on interview -- fallback: filter by created_at
    ...(body.start_from !== undefined &&
      body.start_from !== null && {
        created_at: { gte: body.start_from },
      }),
    ...(body.start_to !== undefined &&
      body.start_to !== null && {
        created_at: { lte: body.start_to },
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { title: { contains: body.search } },
          { notes: { contains: body.search } },
        ],
      }),
  };

  // Query rows and total in parallel for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_interviews.findMany({
      where: interviewWhere,
      orderBy: { created_at: "desc" },
      skip: (numericPage - 1) * numericLimit,
      take: numericLimit,
    }),
    MyGlobal.prisma.ats_recruitment_interviews.count({
      where: interviewWhere,
    }),
  ]);

  return {
    pagination: {
      current: numericPage,
      limit: numericLimit,
      records: total,
      pages: Math.ceil(total / numericLimit),
    },
    data: rows.map((row) => ({
      id: row.id,
      ats_recruitment_application_id: row.ats_recruitment_application_id,
      title: row.title,
      stage: row.stage,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
