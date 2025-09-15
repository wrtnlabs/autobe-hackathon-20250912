import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates job posting state update flows for HR recruiter.
 *
 * 1. Register and authenticate as an HR recruiter
 * 2. Create a job posting state
 * 3. Update label, description, and is_active using PUT
 * 4. Verify the update is reflected
 * 5. Test error on duplicate state_code update
 * 6. Test error for missing or illegal fields (label, sort_order)
 */
export async function test_api_job_posting_state_update_by_hr_recruiter(
  connection: api.IConnection,
) {
  // 1. Register HR recruiter
  const hrEmail: string = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const joinRes = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(joinRes);
  // Login as HR recruiter
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  // 2. Create a job posting state
  const createBody = {
    state_code: RandomGenerator.alphaNumeric(6),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1, sentenceMin: 2 }),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IAtsRecruitmentJobPostingState.ICreate;
  const jobState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(jobState);
  // 3. Update the state (change label, description, is_active)
  const updateBody = {
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1, sentenceMin: 4 }),
    is_active: false,
  } satisfies IAtsRecruitmentJobPostingState.IUpdate;
  const updated =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.update(
      connection,
      {
        jobPostingStateId: jobState.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("label updated", updated.label, updateBody.label);
  TestValidator.equals(
    "description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "is_active updated",
    updated.is_active,
    updateBody.is_active,
  );
  // 4. Try updating state_code to duplicate value
  // First, create another state with different code
  const createBody2 = {
    state_code: RandomGenerator.alphaNumeric(6),
    label: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IAtsRecruitmentJobPostingState.ICreate;
  const jobState2 =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      { body: createBody2 },
    );
  typia.assert(jobState2);
  // Now try to update jobState2 with duplicate state_code (jobState.state_code)
  await TestValidator.error("duplicate state_code should fail", async () => {
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.update(
      connection,
      {
        jobPostingStateId: jobState2.id,
        body: {
          state_code: jobState.state_code,
        } satisfies IAtsRecruitmentJobPostingState.IUpdate,
      },
    );
  });
  // 5. Try missing label (should error)
  await TestValidator.error(
    "missing label (empty string) should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.update(
        connection,
        {
          jobPostingStateId: jobState.id,
          body: { label: "" },
        },
      );
    },
  );
  // 6. Try illegal sort_order (e.g., a negative number)
  await TestValidator.error(
    "illegal sort_order (negative) should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.update(
        connection,
        {
          jobPostingStateId: jobState.id,
          body: { sort_order: -5 as number & tags.Type<"int32"> },
        },
      );
    },
  );
}
