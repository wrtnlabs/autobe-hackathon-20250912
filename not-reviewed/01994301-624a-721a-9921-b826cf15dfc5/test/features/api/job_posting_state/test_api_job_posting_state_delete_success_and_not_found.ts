import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates the complete deletion workflow of a job posting state by an HR
 * recruiter.
 *
 * 1. Register and authenticate as a HR recruiter.
 * 2. Create a new job posting state.
 * 3. Delete the job posting state by its ID (success).
 * 4. Ensure that deleting the same state again fails (not found/error).
 * 5. Attempt to delete a non-existent random state and expect an error.
 */
export async function test_api_job_posting_state_delete_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: hrEmail,
    password: "RecruiterSecret1!",
    name: RandomGenerator.name(),
    department: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  const recruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, { body: joinBody });
  typia.assert(recruiter);

  // 2. Create a new job posting state
  const createBody = {
    state_code: RandomGenerator.alphaNumeric(10),
    label: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IAtsRecruitmentJobPostingState.ICreate;
  const jobPostingState: IAtsRecruitmentJobPostingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      { body: createBody },
    );
  typia.assert(jobPostingState);

  // 3. Delete the created job posting state (should succeed)
  await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.erase(
    connection,
    { jobPostingStateId: jobPostingState.id },
  );

  // 4. Try deleting the same state again (should fail, expect error)
  await TestValidator.error(
    "delete already deleted job posting state should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.erase(
        connection,
        { jobPostingStateId: jobPostingState.id },
      );
    },
  );

  // 5. Try deleting a random non-existent job posting state (should fail)
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete non-existent job posting state should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.erase(
        connection,
        { jobPostingStateId: randomId },
      );
    },
  );
}
