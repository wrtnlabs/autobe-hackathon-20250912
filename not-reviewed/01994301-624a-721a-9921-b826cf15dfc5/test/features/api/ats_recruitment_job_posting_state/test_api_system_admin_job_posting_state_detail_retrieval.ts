import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that a system admin can retrieve the details of a specific job
 * posting state by ID, including business/meta fields, error cases, and
 * permission boundaries.
 *
 * 1. Register a random system admin (POST /auth/systemAdmin/join)
 * 2. Create a job posting state (POST
 *    /atsRecruitment/systemAdmin/jobPostingStates)
 * 3. Retrieve the detail for the created job posting state (GET
 *    /atsRecruitment/systemAdmin/jobPostingStates/{jobPostingStateId})
 * 4. Validate response: 200 OK, all fields, matches input and creation
 * 5. Try with random ID (not found) → expect error
 * 6. Try without admin privileges (unauthenticated) → expect error
 */
export async function test_api_system_admin_job_posting_state_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminInfo = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    super_admin: RandomGenerator.pick([true, false] as const),
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const adminAuth: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: adminInfo });
  typia.assert(adminAuth);

  // 2. Create job posting state
  const stateInput = {
    state_code: RandomGenerator.alphaNumeric(8),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    is_active: RandomGenerator.pick([true, false] as const),
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IAtsRecruitmentJobPostingState.ICreate;
  const state: IAtsRecruitmentJobPostingState =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.create(
      connection,
      { body: stateInput },
    );
  typia.assert(state);

  // 3. Retrieve job posting state detail
  const fetched: IAtsRecruitmentJobPostingState =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.at(
      connection,
      { jobPostingStateId: state.id },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "returned jobPostingState ID matches creation",
    fetched.id,
    state.id,
  );
  TestValidator.equals(
    "returned state_code matches",
    fetched.state_code,
    stateInput.state_code,
  );
  TestValidator.equals(
    "returned label matches",
    fetched.label,
    stateInput.label,
  );
  TestValidator.equals(
    "returned description matches",
    fetched.description,
    stateInput.description,
  );
  TestValidator.equals(
    "returned is_active matches",
    fetched.is_active,
    stateInput.is_active,
  );
  TestValidator.equals(
    "returned sort_order matches",
    fetched.sort_order,
    stateInput.sort_order,
  );
  TestValidator.predicate(
    "created_at is present",
    typeof fetched.created_at === "string" && fetched.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof fetched.updated_at === "string" && fetched.updated_at.length > 0,
  );
  // deleted_at may be undefined/null after creation

  // 4. Try to fetch detail with random, non-existent UUID
  await TestValidator.error(
    "404 error when fetching non-existent jobPostingStateId",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobPostingStates.at(
        connection,
        { jobPostingStateId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );

  // 5. Try to fetch with insufficient privileges (simulate logout by removing token)
  const anonymousConn: api.IConnection = { ...connection, headers: {} }; // no Authorization header
  await TestValidator.error(
    "should not retrieve detail without admin token",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobPostingStates.at(
        anonymousConn,
        { jobPostingStateId: state.id },
      );
    },
  );
}
