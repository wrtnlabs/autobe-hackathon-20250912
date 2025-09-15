import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Comprehensive end-to-end test for system admin interview detail endpoint
 * (/atsRecruitment/systemAdmin/interviews/{interviewId}).
 *
 * This test validates:
 *
 * - System admin can access any interview detail, regardless of participant
 *   roles
 * - The returned interview object contains all required fields (id, title,
 *   stage, status, etc.)
 * - Success case: a valid interviewId returns all interview info
 * - Error (not found): non-existent or deleted interviewId returns error
 * - Error (unauthenticated): no admin session returns error
 *
 * Steps:
 *
 * 1. Register as admin (and authenticate connection)
 * 2. Register applicant (get applicant id)
 * 3. Register HR recruiter (get id)
 * 4. Register tech reviewer (get id)
 * 5. System admin creates an interview (using admin connection)
 * 6. System admin fetches detail of the interview by interviewId (should
 *    succeed)
 * 7. Try to fetch detail with invalid (random) interviewId (should error)
 * 8. (Simulate deletion) Fetch after altering/deleting interview (simulate as
 *    no test API to soft delete)
 * 9. Attempt fetch as unauthenticated connection (should error)
 */
export async function test_api_system_admin_get_interview_detail_comprehensive(
  connection: api.IConnection,
) {
  // 1. Register as system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin12345!",
        name: RandomGenerator.name(),
        super_admin: true,
      },
    });
  typia.assert(admin);

  // 2. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: "Applicant123!",
        name: RandomGenerator.name(),
      },
    });
  typia.assert(applicant);

  // 3. Register HR recruiter
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const hrRecruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: recruiterEmail,
        password: "Recruiter123!",
        name: RandomGenerator.name(),
      },
    });
  typia.assert(hrRecruiter);

  // 4. Register tech reviewer
  const techEmail = typia.random<string & tags.Format<"email">>();
  const techReviewer: IAtsRecruitmentTechReviewer.IAuthorized =
    await api.functional.auth.techReviewer.join(connection, {
      body: {
        email: techEmail,
        password: "Tech123!",
        name: RandomGenerator.name(),
      },
    });
  typia.assert(techReviewer);

  // 5. System admin creates new interview entity (simulate a new job application id for interview)
  const randomApplicationId = typia.random<string & tags.Format<"uuid">>();
  const interviewCreateBody = {
    ats_recruitment_application_id: randomApplicationId,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    stage: "first_phase",
    status: "scheduled",
    notes: RandomGenerator.paragraph(),
  } satisfies IAtsRecruitmentInterview.ICreate;
  const interview: IAtsRecruitmentInterview =
    await api.functional.atsRecruitment.systemAdmin.interviews.create(
      connection,
      { body: interviewCreateBody },
    );
  typia.assert(interview);

  // 6. Positive: System admin fetches interview detail by interviewId
  const fetched: IAtsRecruitmentInterview =
    await api.functional.atsRecruitment.systemAdmin.interviews.at(connection, {
      interviewId: interview.id,
    });
  typia.assert(fetched);
  TestValidator.equals(
    "returned interview id matches",
    fetched.id,
    interview.id,
  );
  TestValidator.equals(
    "returned application id matches",
    fetched.ats_recruitment_application_id,
    interview.ats_recruitment_application_id,
  );

  // 7. Negative: Use an invalid/non-existent interviewId
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent interviewId returns error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.at(
        connection,
        { interviewId: randomId },
      );
    },
  );

  // 8. Negative: simulate 'deleted' by calling with deleted_at property set (cannot actually delete, so only scenario)
  // (If API allowed soft-delete, we would delete then test not found)
  // Skipped as no endpoint to mark deleted

  // 9. Negative: attempt to fetch detail with unauthenticated (admin) connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin fails to fetch interview detail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.at(
        unauthConn,
        { interviewId: interview.id },
      );
    },
  );
}
