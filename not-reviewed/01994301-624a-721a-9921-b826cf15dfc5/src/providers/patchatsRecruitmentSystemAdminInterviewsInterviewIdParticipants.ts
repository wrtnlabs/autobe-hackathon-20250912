import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import { IPageIAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterviewParticipant";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List all participants for a specific interview
 * (ats_recruitment_interview_participants table).
 *
 * This operation retrieves a paginated, searchable list of all participants
 * associated with a specific interview instance, as stored in the
 * ats_recruitment_interview_participants table. Used by authorized HR, tech
 * reviewers, or applicants to view their own involvement. Enables UI to show
 * all invited/assigned participants, roles, statuses, and confirmation info per
 * interview.
 *
 * Supports filtering, sorting, and pagination for large group interviews. Only
 * system administrators, or actors involved in the interview, may access.
 * Throws error if interview does not exist.
 *
 * @param props - Request payload
 * @param props.systemAdmin - Authenticated system admin making the request
 * @param props.interviewId - Target interview ID (UUID)
 * @param props.body - Paging, filtering, and sorting options for participant
 *   query
 * @returns Paginated result: participants with roles and status for the
 *   interview.
 * @throws {Error} If interview is not found, or any database error occurs.
 */
export async function patchatsRecruitmentSystemAdminInterviewsInterviewIdParticipants(props: {
  systemAdmin: SystemadminPayload;
  interviewId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewParticipant.IRequest;
}): Promise<IPageIAtsRecruitmentInterviewParticipant> {
  const { interviewId, body } = props;

  // Step 1: Ensure interview exists
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findUnique(
    {
      where: { id: interviewId },
    },
  );
  if (!interview) {
    throw new Error("Interview not found");
  }

  // Step 2: Pagination parameters
  const page = typeof body.page === "number" && body.page >= 1 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit >= 1 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Step 3: Filtering
  const where = {
    ats_recruitment_interview_id: interviewId,
    ...(body.role !== undefined && { role: body.role }),
    ...(body.confirmation_status !== undefined && {
      confirmation_status: body.confirmation_status,
    }),
  };

  // Step 4: Sorting
  const allowedSortFields = ["role", "confirmation_status", "invited_at"];
  const sortField =
    body.sort && allowedSortFields.includes(body.sort)
      ? body.sort
      : "invited_at";
  const sortOrder = body.order === "ASC" ? "asc" : "desc";

  // Step 5: Query total and data
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_interview_participants.count({ where }),
    MyGlobal.prisma.ats_recruitment_interview_participants.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
  ]);

  // Step 6: Map results to DTO
  const data = rows.map((row) => ({
    id: row.id,
    ats_recruitment_interview_id: row.ats_recruitment_interview_id,
    ats_recruitment_applicant_id:
      row.ats_recruitment_applicant_id === null
        ? undefined
        : row.ats_recruitment_applicant_id,
    ats_recruitment_hrrecruiter_id:
      row.ats_recruitment_hrrecruiter_id === null
        ? undefined
        : row.ats_recruitment_hrrecruiter_id,
    ats_recruitment_techreviewer_id:
      row.ats_recruitment_techreviewer_id === null
        ? undefined
        : row.ats_recruitment_techreviewer_id,
    role: row.role,
    invited_at: toISOStringSafe(row.invited_at),
    confirmation_status: row.confirmation_status,
    created_at: toISOStringSafe(row.created_at),
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
