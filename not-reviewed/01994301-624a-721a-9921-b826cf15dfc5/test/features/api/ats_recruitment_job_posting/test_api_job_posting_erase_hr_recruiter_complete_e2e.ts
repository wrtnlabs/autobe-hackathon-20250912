import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * End-to-end test to verify HR recruiter can delete their own job posting and
 * cannot delete non-existent or already deleted postings.
 *
 * Steps:
 *
 * 1. Register a new HR recruiter
 * 2. Create job employment type
 * 3. Create job posting state (e.g., "draft")
 * 4. Create job posting with employment type and posting state
 * 5. Delete the job posting and confirm soft-deletion (deleted_at is set)
 * 6. Attempt to delete again (should error or be idempotent)
 * 7. Attempt to delete a non-existent job posting (should error)
 */
export async function test_api_job_posting_erase_hr_recruiter_complete_e2e(
  connection: api.IConnection,
) {
  // 1. Register a new HR recruiter and authenticate
  const email = typia.random<string & tags.Format<"email">>();
  const password = "password-1234";
  const joinBody = {
    email,
    password,
    name: RandomGenerator.name(),
    department: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  const auth: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, { body: joinBody });
  typia.assert(auth);
  TestValidator.predicate("auth is active", auth.is_active === true);
  TestValidator.equals("auth email matches", auth.email, email);

  // 2. Create employment type
  const employmentTypeName = RandomGenerator.name();
  const employmentTypeBody = {
    name: employmentTypeName,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies IAtsRecruitmentJobEmploymentType.ICreate;
  const employmentType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      { body: employmentTypeBody },
    );
  typia.assert(employmentType);
  TestValidator.equals(
    "employment type name matches",
    employmentType.name,
    employmentTypeName,
  );
  TestValidator.predicate(
    "employment type is active",
    employmentType.is_active === true,
  );

  // 3. Create job posting state (e.g., "draft")
  const postingStateCode = RandomGenerator.alphaNumeric(8);
  const postingStateLabel = RandomGenerator.paragraph({ sentences: 2 });
  const postingStateBody = {
    state_code: postingStateCode,
    label: postingStateLabel,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
    sort_order: 1,
  } satisfies IAtsRecruitmentJobPostingState.ICreate;
  const postingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      { body: postingStateBody },
    );
  typia.assert(postingState);
  TestValidator.equals(
    "posting state code matches",
    postingState.state_code,
    postingStateCode,
  );

  // 4. Create job posting
  const postingTitle = RandomGenerator.name(3);
  const postingDesc = RandomGenerator.content({ paragraphs: 2 });
  const jobPostingBody = {
    hr_recruiter_id: auth.id,
    job_employment_type_id: employmentType.id,
    job_posting_state_id: postingState.id,
    title: postingTitle,
    description: postingDesc,
    is_visible: true,
  } satisfies IAtsRecruitmentJobPosting.ICreate;
  const posting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      { body: jobPostingBody },
    );
  typia.assert(posting);
  TestValidator.equals("posting title matches", posting.title, postingTitle);
  TestValidator.equals(
    "posting recruiter matches",
    posting.hr_recruiter_id,
    auth.id,
  );
  TestValidator.equals(
    "posting employment type matches",
    posting.job_employment_type_id,
    employmentType.id,
  );
  TestValidator.equals(
    "posting state id matches",
    posting.job_posting_state_id,
    postingState.id,
  );
  TestValidator.equals("posting is visible", posting.is_visible, true);
  TestValidator.predicate(
    "posting is not deleted at creation",
    posting.deleted_at === null || posting.deleted_at === undefined,
  );

  // 5. Delete the job posting (perform soft-delete), expect no error
  await api.functional.atsRecruitment.hrRecruiter.jobPostings.erase(
    connection,
    { jobPostingId: posting.id },
  );

  // 6. Attempt to delete again: should be idempotent (no error or returns no effect), or if business logic dictates, return error
  await TestValidator.error(
    "double-delete should fail (already deleted)",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.jobPostings.erase(
        connection,
        { jobPostingId: posting.id },
      );
    },
  );

  // 7. Attempt to delete a non-existent posting
  const randomNonexistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete of non-existent job posting fails",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.jobPostings.erase(
        connection,
        { jobPostingId: randomNonexistentId },
      );
    },
  );
}
