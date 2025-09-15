import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Verifies HR recruiter job posting state creation and the enforcement of
 * business rules by API.
 *
 * Steps:
 *
 * 1. Register a new HR recruiter (unique email/password/name/department)
 * 2. Login as newly registered HR recruiter
 * 3. Create a new job posting state with unique state_code via API; validate
 *    response fields (id, state_code, label, is_active, sort_order,
 *    created_at, updated_at, description, deleted_at)
 * 4. Attempt duplicate creation with the same state_code; expect error
 * 5. Test error cases: invalid required fields (i.e., empty code, empty label,
 *    and null for optional fields if allowed)
 */
export async function test_api_job_posting_state_creation_by_hr_recruiter(
  connection: api.IConnection,
) {
  // 1. Register a new HR recruiter
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = RandomGenerator.alphaNumeric(12);
  const recruiterName = RandomGenerator.name();
  const recruiterDepartment = RandomGenerator.name();
  const recruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
      name: recruiterName,
      department: recruiterDepartment,
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiter);

  // 2. Login as HR recruiter (sets Authorization token)
  const loginResp = await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  typia.assert(loginResp);

  // 3. Create a new job posting state
  const stateCode = RandomGenerator.alphaNumeric(8).toLowerCase();
  const label = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 9,
  });
  const sortOrder = typia.random<number & tags.Type<"int32">>();
  const description = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 8,
    wordMin: 4,
    wordMax: 8,
  });

  const createBody = {
    state_code: stateCode,
    label,
    description,
    is_active: true,
    sort_order: sortOrder,
  } satisfies IAtsRecruitmentJobPostingState.ICreate;

  const newState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      { body: createBody },
    );
  typia.assert(newState);
  // Validate returned fields
  TestValidator.equals(
    "state_code matches input",
    newState.state_code,
    stateCode,
  );
  TestValidator.equals("label matches input", newState.label, label);
  TestValidator.equals("is_active matches input", newState.is_active, true);
  TestValidator.equals(
    "sort_order matches input",
    newState.sort_order,
    sortOrder,
  );
  TestValidator.equals(
    "description matches input",
    newState.description,
    description,
  );
  TestValidator.predicate(
    "state has generated id",
    typeof newState.id === "string" && newState.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is present",
    typeof newState.created_at === "string" && newState.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof newState.updated_at === "string" && newState.updated_at.length > 0,
  );
  // deleted_at can be undefined/null (not checked)

  // 4. Attempt to create duplicate state_code -- must error
  await TestValidator.error("duplicate state_code not allowed", async () => {
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      { body: createBody },
    );
  });

  // 5. Test error cases: invalid required fields
  // 5a. Empty string state_code
  await TestValidator.error("empty state_code", async () => {
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      {
        body: { ...createBody, state_code: "" },
      },
    );
  });

  // 5b. Empty label
  await TestValidator.error("empty label", async () => {
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      {
        body: { ...createBody, label: "" },
      },
    );
  });
}
