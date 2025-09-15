import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate soft-delete and access block for a scheduled interview in ATS HR
 * module.
 *
 * This test does the following:
 *
 * 1. Registers a new HR recruiter with random but valid credentials.
 * 2. Authenticates as that HR recruiter to set authorization context.
 * 3. Creates a valid interview (with randomly generated data, referencing a
 *    random applicationId).
 * 4. Deletes the interview using DELETE
 *    /atsRecruitment/hrRecruiter/interviews/{interviewId}.
 * 5. Validates that after deletion:
 *
 *    - The interview's 'deleted_at' timestamp is set (can be observed by direct
 *         GET or patched index if available),
 *    - It is not returned in any standard index results (skip due to missing
 *         list API),
 *    - Access via GET fails or returns indication of deletion if attempted
 *         (simulate with error call or logical comment, as no GET API).
 *    - Related entities like participants/schedules would be referenced for
 *         audit but no delete is attempted (as these are not in API).
 * 6. Attempts to delete the interview again, expecting an error.
 * 7. Attempts to delete a non-existent (random UUID) interview, expecting an
 *    error.
 *
 * Note: Since list and read APIs for interviews are not present in the
 * available SDK, validations are limited to what is exposed by the create
 * and erase endpoints, with business rule assertions via error scenarios
 * and logical control. All authentication and setup uses only the specified
 * endpoints and DTOs.
 */
export async function test_api_hr_interview_deletion_soft_delete_and_access_block(
  connection: api.IConnection,
) {
  // Step 1: HR recruiter registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const department = RandomGenerator.name(1);

  const joinResult = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email,
      password,
      name,
      department,
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(joinResult);

  // Step 2: HR recruiter login
  const loginResult = await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email,
      password,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  typia.assert(loginResult);

  // Step 3: Create new interview (simulate application linkage)
  const applicationId = typia.random<string & tags.Format<"uuid">>();
  const interviewCreateBody = {
    ats_recruitment_application_id: applicationId,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    stage: RandomGenerator.pick([
      "first_phase",
      "tech_round",
      "hr",
      "final",
      "custom",
    ] as const),
    status: RandomGenerator.pick([
      "scheduled",
      "pending",
      "completed",
      "cancelled",
    ] as const),
    notes: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IAtsRecruitmentInterview.ICreate;

  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: interviewCreateBody,
      },
    );
  typia.assert(interview);
  TestValidator.equals(
    "created application linkage",
    interview.ats_recruitment_application_id,
    applicationId,
  );
  TestValidator.equals(
    "created interview title matches",
    interview.title,
    interviewCreateBody.title,
  );
  TestValidator.equals(
    "created interview stage matches",
    interview.stage,
    interviewCreateBody.stage,
  );
  TestValidator.equals(
    "created interview status matches",
    interview.status,
    interviewCreateBody.status,
  );
  TestValidator.equals(
    "created interview notes match",
    interview.notes,
    interviewCreateBody.notes,
  );
  TestValidator.equals(
    "deleted_at must be null initially",
    interview.deleted_at,
    null,
  );

  // Step 4: Soft-delete the interview
  await api.functional.atsRecruitment.hrRecruiter.interviews.erase(connection, {
    interviewId: interview.id,
  });

  // Step 5: Validate post-deletion state
  // No GET or LIST API, so we assert by attempting delete again, expecting error
  await TestValidator.error(
    "deleting already deleted interview fails",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.erase(
        connection,
        {
          interviewId: interview.id,
        },
      );
    },
  );

  // Step 6: Try deleting a random non-existent interview (random UUID)
  const randomInterviewId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent interview fails",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.erase(
        connection,
        {
          interviewId: randomInterviewId,
        },
      );
    },
  );

  // Note: No way to directly GET or check interview state after delete, and no participants/schedules endpoints available.
  // Business rule coverage for audit trail would be performed with those APIs if they were available.
}
