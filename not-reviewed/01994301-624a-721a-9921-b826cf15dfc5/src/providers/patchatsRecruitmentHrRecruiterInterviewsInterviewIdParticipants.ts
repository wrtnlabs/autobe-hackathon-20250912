import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import { IPageIAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterviewParticipant";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * List all participants for a specific interview
 * (ats_recruitment_interview_participants table).
 *
 * Fetch a paginated list of all participants, including HR recruiters,
 * applicants, and tech reviewers, for a given interview event. The interviewId
 * identifies the parent interview entity. The results are retrieved from
 * ats_recruitment_interview_participants and include each participant's role,
 * identity reference, confirmation status, and invitation timestamp.
 *
 * The endpoint supports filtering, sorting, and pagination by role, status and
 * more. Only HR recruiters assigned as participants for the interview may
 * access this endpoint. Ensures data visibility, privacy, and compliance for
 * participant management flows. Paginated results support large group
 * interviews.
 *
 * @param props - Request properties
 * @param props.hrRecruiter - The authenticated HR recruiter making the request
 *   (must be assigned as participant in the interview)
 * @param props.interviewId - Unique identifier for the parent interview
 * @param props.body - Search/filter, sort, and pagination parameters
 * @returns Paginated result: participants with roles and status for the
 *   interview
 * @throws {Error} If the recruiter is not a participant in the interview or
 *   interview ID is invalid
 */
export async function patchatsRecruitmentHrRecruiterInterviewsInterviewIdParticipants(props: {
  hrRecruiter: HrrecruiterPayload;
  interviewId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewParticipant.IRequest;
}): Promise<IPageIAtsRecruitmentInterviewParticipant> {
  const { hrRecruiter, interviewId, body } = props;

  // Ensure the requesting recruiter is a participant in the interview (authorization)
  const recruiterAssigned =
    await MyGlobal.prisma.ats_recruitment_interview_participants.findFirst({
      where: {
        ats_recruitment_interview_id: interviewId,
        ats_recruitment_hrrecruiter_id: hrRecruiter.id,
      },
    });
  if (!recruiterAssigned)
    throw new Error(
      "You are not authorized to view this interview's participants.",
    );

  // Build query filter based on search params
  const where = {
    ats_recruitment_interview_id: interviewId,
    ...(body.role !== undefined && body.role !== null && { role: body.role }),
    ...(body.confirmation_status !== undefined &&
      body.confirmation_status !== null && {
        confirmation_status: body.confirmation_status,
      }),
  };

  // Pagination and sorting logic
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const allowedSortFields = [
    "created_at",
    "invited_at",
    "role",
    "confirmation_status",
  ];
  const sortField = allowedSortFields.includes(body.sort ?? "")
    ? body.sort!
    : "created_at";
  const allowedSortOrders = ["ASC", "DESC"];
  const sortOrder = allowedSortOrders.includes(
    (body.order ?? "DESC").toUpperCase(),
  )
    ? (body.order ?? "DESC").toUpperCase()
    : "DESC";

  // Fetch data with total count for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_interview_participants.findMany({
      where,
      orderBy: { [sortField]: sortOrder.toLowerCase() },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_interview_participants.count({ where }),
  ]);

  // Transform results to API structure (always serialize dates)
  const data = rows.map((row) => ({
    id: row.id,
    ats_recruitment_interview_id: row.ats_recruitment_interview_id,
    ats_recruitment_applicant_id: row.ats_recruitment_applicant_id ?? undefined,
    ats_recruitment_hrrecruiter_id:
      row.ats_recruitment_hrrecruiter_id ?? undefined,
    ats_recruitment_techreviewer_id:
      row.ats_recruitment_techreviewer_id ?? undefined,
    role: row.role,
    invited_at: toISOStringSafe(row.invited_at),
    confirmation_status: row.confirmation_status,
    created_at: toISOStringSafe(row.created_at),
  }));

  // Compose and return the paginated response
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
