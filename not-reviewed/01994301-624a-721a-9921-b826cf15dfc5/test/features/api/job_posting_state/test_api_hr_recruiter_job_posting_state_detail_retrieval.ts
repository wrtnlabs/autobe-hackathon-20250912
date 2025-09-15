import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * HR recruiter should be able to retrieve the details for an existing job
 * posting state definition using its unique ID, provided the HR account is
 * authenticated. Admin creates a job posting state, then HR recruiter
 * fetches it. Should receive all data fields (id, state_code, label,
 * description, is_active, sort_order, timestamps). Invalid, missing, or
 * deleted IDs must result in errors.
 */
export async function test_api_hr_recruiter_job_posting_state_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin (for state creation)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      super_admin: false,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(adminJoin);
  // 2. Register and login as HR recruiter (test actor)
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hrJoin = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrJoin);
  // 3. System admin login (ensure admin context)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  // 4. System admin creates a job posting state
  const jobPostingStateInput = {
    state_code: RandomGenerator.alphaNumeric(6),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IAtsRecruitmentJobPostingState.ICreate;
  const createdState =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.create(
      connection,
      {
        body: jobPostingStateInput,
      },
    );
  typia.assert(createdState);
  // 5. Login as HR recruiter for main test context
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  // 6. HR recruiter gets job posting state by ID
  const fetched =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.at(
      connection,
      {
        jobPostingStateId: createdState.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "jobPostingState details match",
    fetched.state_code,
    jobPostingStateInput.state_code,
  );
  TestValidator.equals(
    "jobPostingState label match",
    fetched.label,
    jobPostingStateInput.label,
  );
  TestValidator.equals(
    "jobPostingState description match",
    fetched.description,
    jobPostingStateInput.description,
  );
  TestValidator.equals(
    "jobPostingState is_active",
    fetched.is_active,
    jobPostingStateInput.is_active,
  );
  TestValidator.equals(
    "jobPostingState sort_order",
    fetched.sort_order,
    jobPostingStateInput.sort_order,
  );
  // 7. Error case: Request with random (non-existent) jobPostingStateId
  await TestValidator.error(
    "Not found for non-existent jobPostingStateId",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.at(
        connection,
        {
          jobPostingStateId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
