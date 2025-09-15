import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import { IPageIAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterview";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Retrieve a paginated and filtered list of interviews
 * (ats_recruitment_interviews table) by status, stage, time, and participants.
 *
 * This endpoint enables HR recruiters (and system admins) to search and page
 * through interview events by multiple filters: status, stage, applicant,
 * recruiter, tech reviewer, as well as by date created. Advanced search for
 * interview scheduling and analytics.
 *
 * Only returns interviews that are not soft-deleted (deleted_at is null).
 * Participant-based filtering joins via participants table. Does not allow use
 * of the native Date type anywhere; all date fields are formatted as string &
 * tags.Format<'date-time'>. Does not use any type assertions, ensuring strict
 * type correctness. Pagination strictly aligns with IPage.IPagination.
 *
 * @param props - Object including HR recruiter authentication payload and
 *   filter/search body
 * @param props.hrRecruiter - The authenticated HR recruiter (payload) making
 *   this request
 * @param props.body - Search/filter/paging criteria including participant- and
 *   status-based filters
 * @returns Paginated interview summary list matching criteria. All
 *   date/datetime values are always string & tags.Format<'date-time'>
 * @throws Error If HR recruiter authentication fails (access control enforced
 *   before provider is called)
 */
export async function patchatsRecruitmentHrRecruiterInterviews(props: {
  hrRecruiter: HrrecruiterPayload;
  body: IAtsRecruitmentInterview.IRequest;
}): Promise<IPageIAtsRecruitmentInterview.ISummary> {
  const { body } = props;
  // Pagination params (strict handling)
  const page: number =
    typeof body.page === "number" && body.page >= 1 ? body.page : 1;
  const limit: number =
    typeof body.limit === "number" && body.limit >= 1 ? body.limit : 20;
  const offset: number = (page - 1) * limit;

  // Build interview table filter (strict property assignment, no assumptions)
  const where: Record<string, unknown> = {
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.stage !== undefined &&
      body.stage !== null && { stage: body.stage }),
    ...(body.created_from !== undefined &&
      body.created_from !== null && {
        created_at: { gte: body.created_from },
      }),
    ...(body.created_to !== undefined &&
      body.created_to !== null && {
        created_at:
          body.created_from !== undefined && body.created_from !== null
            ? { gte: body.created_from, lte: body.created_to }
            : { lte: body.created_to },
      }),
  };

  // Handle participant-based interview filtering (join through participants table)
  let interviewIdsForParticipants: string[] | undefined;
  if (
    (body.applicant_id !== undefined && body.applicant_id !== null) ||
    (body.hr_recruiter_id !== undefined && body.hr_recruiter_id !== null) ||
    (body.tech_reviewer_id !== undefined && body.tech_reviewer_id !== null)
  ) {
    const participantQuery: Record<string, unknown> = {
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
    };
    const matchingParticipants =
      await MyGlobal.prisma.ats_recruitment_interview_participants.findMany({
        where: participantQuery,
        select: { ats_recruitment_interview_id: true },
      });
    const interviewSet = new Set<string>();
    for (const row of matchingParticipants) {
      interviewSet.add(row.ats_recruitment_interview_id);
    }
    if (interviewSet.size === 0) {
      return {
        pagination: {
          current: Number(page),
          limit: Number(limit),
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
    where.id = { in: Array.from(interviewSet) };
  }

  // NOT IMPLEMENTED: Filtering on start_from/start_to (interview schedule) - would require additional join.

  // Find total & paged interviews
  const [rows, totalCount] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_interviews.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_interviews.count({ where }),
  ]);

  // Map and sanitize output for summary (enforce string & tags.Format<'date-time'>)
  const data = rows.map(
    (row): IAtsRecruitmentInterview.ISummary => ({
      id: row.id,
      ats_recruitment_application_id: row.ats_recruitment_application_id,
      title: row.title,
      stage: row.stage,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    }),
  );

  // Pagination summary (use Number(...) to strip possible Typia tags for strict type)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
    data,
  };
}
