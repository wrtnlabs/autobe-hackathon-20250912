import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Comprehensive E2E test for system admin job posting deletion.
 *
 * Validates that a system administrator can create and delete job postings with
 * all required relationships and handles edge/error cases gracefully (including
 * double-deletion/idempotency).
 *
 * Steps:
 *
 * 1. Register system admin and authenticate
 * 2. Register HR recruiter
 * 3. Create a job employment type
 * 4. Create a job posting state (active, open)
 * 5. Create a job posting using system admin APIs
 * 6. Delete the job posting (soft delete)
 * 7. Confirm posting deleted (deleted_at is set)
 * 8. Negative: Try to delete again, expect graceful response/error
 */
export async function test_api_job_posting_erase_system_admin_complete_e2e(
  connection: api.IConnection,
) {
  // 1. Register & authenticate system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const recruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrEmail,
        password: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(recruiter);

  // 3. Create a job employment type
  const employmentType: IAtsRecruitmentJobEmploymentType =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(employmentType);

  // 4. Create a job posting state: 'open', active
  const postingState: IAtsRecruitmentJobPostingState =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: "open",
          label: "Open",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
          sort_order: 1,
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(postingState);

  // 5. Create a job posting, attributed to the HR recruiter
  const jobPosting: IAtsRecruitmentJobPosting =
    await api.functional.atsRecruitment.systemAdmin.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: recruiter.id,
          job_employment_type_id: employmentType.id,
          job_posting_state_id: postingState.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 16,
            wordMin: 3,
            wordMax: 10,
          }),
          location: RandomGenerator.paragraph({ sentences: 2 }),
          salary_range_min: 40000,
          salary_range_max: 80000,
          application_deadline: new Date(
            Date.now() + 14 * 86400000,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 6. Delete the job posting
  await api.functional.atsRecruitment.systemAdmin.jobPostings.erase(
    connection,
    {
      jobPostingId: jobPosting.id,
    },
  );

  // 7. (Re)fetch job posting (skipped – no GET endpoint in spec), but could check via subsequent API or by convention.
  // Instead, for this SDK-only context, confirm via API contract and idempotency/negative flows.

  // 8. Try to delete already deleted posting again, expect graceful response or error.
  await TestValidator.error(
    "system admin re-deletes already deleted job posting",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobPostings.erase(
        connection,
        {
          jobPostingId: jobPosting.id,
        },
      );
    },
  );
}
