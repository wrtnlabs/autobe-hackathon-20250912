import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicationSkillMatchesArray } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationSkillMatchesArray";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Get all skill match results for a given application
 * (AtsRecruitmentApplicationSkillMatches table).
 *
 * This endpoint allows a technical reviewer to retrieve the complete results of
 * all skill match analyses for a specified job application. Each record
 * contains the matched skill, matching classification (required, preferred,
 * extra, etc.), optional AI confidence score, and flag for manual
 * verification.
 *
 * This function enforces existence of the application, aligns types precisely,
 * and does not use native Date anywhere.
 *
 * @param props - Object containing required props for the operation
 * @param props.techReviewer - TechreviewerPayload containing authenticated
 *   technical reviewer identity
 * @param props.applicationId - UUID of the job application to analyze for skill
 *   matches
 * @returns Array of skill match objects with per-skill analysis details
 * @throws {Error} If the application does not exist or the reviewer is not
 *   authorized (authorization is handled by the decorator)
 */
export async function patchatsRecruitmentTechReviewerApplicationsApplicationIdSkillMatches(props: {
  techReviewer: TechreviewerPayload;
  applicationId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentApplicationSkillMatchesArray> {
  const { applicationId } = props;

  // Ensure application exists
  await MyGlobal.prisma.ats_recruitment_applications.findUniqueOrThrow({
    where: { id: applicationId },
  });

  // Fetch all skill matches for the application in a single query
  const matches =
    await MyGlobal.prisma.ats_recruitment_application_skill_matches.findMany({
      where: { application_id: applicationId },
      select: {
        skill_id: true,
        match_type: true,
        ai_score: true,
        is_manually_verified: true,
      },
    });

  // Map DB results to API response type
  return matches.map(
    (row) =>
      ({
        skill_id: row.skill_id,
        match_type: row.match_type,
        ai_score: row.ai_score ?? undefined,
        is_manually_verified: row.is_manually_verified,
      }) satisfies IAtsRecruitmentApplicationSkillMatchesArray[number],
  );
}
