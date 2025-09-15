import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import { IPageIAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterviewParticipant";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * List all participants for a specific interview
 * (ats_recruitment_interview_participants table).
 *
 * This operation retrieves a paginated, searchable list of all participants
 * associated with a specific interview instance, as stored in the
 * ats_recruitment_interview_participants table. Only tech reviewers who are
 * explicitly assigned as participants in the interview may access the
 * participants list. Supports filtering by role and confirmation status,
 * sorting, and pagination.
 *
 * @param props - The request parameters.
 * @param props.techReviewer - The authenticated tech reviewer making the
 *   request.
 * @param props.interviewId - UUID of the interview instance.
 * @param props.body - Filter/search and pagination parameters (role,
 *   confirmation_status, page, limit, sort, order)
 * @returns The paginated list of all participants for the interview
 * @throws {Error} If the tech reviewer is not a participant of the interview,
 *   or if the interview has no such participants
 */
export async function patchatsRecruitmentTechReviewerInterviewsInterviewIdParticipants(props: {
  techReviewer: TechreviewerPayload;
  interviewId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewParticipant.IRequest;
}): Promise<IPageIAtsRecruitmentInterviewParticipant> {
  const { techReviewer, interviewId, body } = props;

  // 1. Authorization: Ensure tech reviewer is a valid participant on this interview
  const reviewerParticipant =
    await MyGlobal.prisma.ats_recruitment_interview_participants.findFirst({
      where: {
        ats_recruitment_interview_id: interviewId,
        ats_recruitment_techreviewer_id: techReviewer.id,
      },
    });
  if (!reviewerParticipant) {
    throw new Error(
      "Unauthorized: Tech reviewer is not a participant in this interview",
    );
  }

  // 2. Pagination and filtering setup
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 3. Build safe and explicit filter object
  const filters: Record<string, unknown> = {
    ats_recruitment_interview_id: interviewId,
    ...(body.role !== undefined && body.role !== null && { role: body.role }),
    ...(body.confirmation_status !== undefined &&
      body.confirmation_status !== null && {
        confirmation_status: body.confirmation_status,
      }),
  };

  // 4. Sorting: restrict to allowed columns only
  const allowedSortFields = ["role", "confirmation_status", "invited_at"];
  const sortField = allowedSortFields.includes(body.sort ?? "")
    ? (body.sort as "role" | "confirmation_status" | "invited_at")
    : "invited_at";
  const order = body.order === "ASC" ? "asc" : "desc";

  // 5. Query: fetch paginated data and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_interview_participants.findMany({
      where: filters,
      orderBy: { [sortField]: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_interview_participants.count({
      where: filters,
    }),
  ]);

  // 6. Shape output: map dates to ISO strings strictly, avoid any type assertion!
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: rows.map((row) => {
      const participant: IAtsRecruitmentInterviewParticipant = {
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
      };
      return participant;
    }),
  };
}
