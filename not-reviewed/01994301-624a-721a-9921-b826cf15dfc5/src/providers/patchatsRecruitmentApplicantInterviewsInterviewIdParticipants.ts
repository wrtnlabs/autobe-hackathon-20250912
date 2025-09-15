import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import { IPageIAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterviewParticipant";
import { ApplicantPayload } from "../decorators/payload/ApplicantPayload";

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
 * The endpoint supports complex query parameters for filtering by role, status,
 * or participantId if extended. Only actors involved in the interview or
 * administrators may access this endpoint. Ensures data visibility, privacy,
 * and audit for all participant management flows. Paginated results support
 * large group interviews and compliance with security policies.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.applicant - The authenticated applicant making the request
 * @param props.interviewId - Unique identifier for the interview parent entity
 * @param props.body - Filter, sort, and pagination parameters for the
 *   participant search
 * @returns Paginated participants list (roles, reference IDs, timestamps)
 * @throws {Error} If the applicant does not have permission to view
 *   participants (not a participant in this interview)
 */
export async function patchatsRecruitmentApplicantInterviewsInterviewIdParticipants(props: {
  applicant: ApplicantPayload;
  interviewId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewParticipant.IRequest;
}): Promise<IPageIAtsRecruitmentInterviewParticipant> {
  const { applicant, interviewId, body } = props;

  // 1. Authorization: applicant must be a participant in this interview
  const isParticipant =
    await MyGlobal.prisma.ats_recruitment_interview_participants.findFirst({
      where: {
        ats_recruitment_interview_id: interviewId,
        ats_recruitment_applicant_id: applicant.id,
      },
      select: { id: true },
    });
  if (!isParticipant) {
    throw new Error(
      "Unauthorized: applicant is not a participant in this interview",
    );
  }

  // 2. Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 3. Where clause for search/filters
  const where = {
    ats_recruitment_interview_id: interviewId,
    ...(body.role !== undefined ? { role: body.role } : {}),
    ...(body.confirmation_status !== undefined
      ? { confirmation_status: body.confirmation_status }
      : {}),
  };

  // 4. Validate sorting fields
  const allowedSortFields = [
    "role",
    "confirmation_status",
    "invited_at",
    "created_at",
  ];
  let orderByField = "invited_at";
  if (body.sort !== undefined && allowedSortFields.includes(body.sort)) {
    orderByField = body.sort;
  }
  let orderByDir: "asc" | "desc" = "desc";
  if (body.order === "ASC") orderByDir = "asc";
  else if (body.order === "DESC") orderByDir = "desc";

  // 5. Query data and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_interview_participants.findMany({
      where,
      orderBy: [Object.assign({}, { [orderByField]: orderByDir })],
      skip,
      take: limit,
      select: {
        id: true,
        ats_recruitment_interview_id: true,
        ats_recruitment_applicant_id: true,
        ats_recruitment_hrrecruiter_id: true,
        ats_recruitment_techreviewer_id: true,
        role: true,
        invited_at: true,
        confirmation_status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.ats_recruitment_interview_participants.count({ where }),
  ]);

  // 6. Map response rows to DTO, converting date fields and nulls
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      ats_recruitment_interview_id: row.ats_recruitment_interview_id,
      ats_recruitment_applicant_id:
        row.ats_recruitment_applicant_id ?? undefined,
      ats_recruitment_hrrecruiter_id:
        row.ats_recruitment_hrrecruiter_id ?? undefined,
      ats_recruitment_techreviewer_id:
        row.ats_recruitment_techreviewer_id ?? undefined,
      role: row.role,
      invited_at: toISOStringSafe(row.invited_at),
      confirmation_status: row.confirmation_status,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
