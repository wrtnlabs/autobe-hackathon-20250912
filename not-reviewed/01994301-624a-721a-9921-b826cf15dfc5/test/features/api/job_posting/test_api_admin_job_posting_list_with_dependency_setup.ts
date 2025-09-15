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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentJobPosting";

/**
 * End-to-end test for admin job posting list with full dependency setup.
 *
 * - Registers a system admin, logs in, creates required job entity dependencies
 *   (posting state, employment type, HR recruiter).
 * - Creates a job posting with all generated dependencies.
 * - Validates that admin can search for job postings using no filters, filters by
 *   recruiter/employment type/state/visibility/title, and paginates results.
 * - Checks negative filtering by using a non-matching recruiter id.
 * - Optionally, creates a second posting to test actual pagination splitting if
 *   time/space permits.
 * - All business entities use unique random identifiers and randomized, but
 *   valid, values.
 * - All steps validated by TestValidator assertions and typia.assert runtime type
 *   validation.
 */
export async function test_api_admin_job_posting_list_with_dependency_setup(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();

  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Login as system admin
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3. Create job posting state
  const postingState =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: RandomGenerator.alphabets(8),
          label: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          is_active: true,
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(postingState);

  // 4. Create job employment type
  const employmentType =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(employmentType);

  // 5. Register HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(10);
  const hrName = RandomGenerator.name();
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: hrName,
      department: RandomGenerator.name(1),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  // 6. Create a job posting as admin
  const postingTitle = RandomGenerator.paragraph({ sentences: 4 });
  const postingDescription = RandomGenerator.content({ paragraphs: 1 });
  const location = RandomGenerator.paragraph({ sentences: 2 });
  // salary_min/max: always positive (min <= max)
  const salaryMin = (Math.abs(typia.random<number>()) % 100000) + 1;
  const salaryMax =
    salaryMin + Math.floor(Math.abs(typia.random<number>() * 10000));
  const applicationDeadline = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const jobPosting =
    await api.functional.atsRecruitment.systemAdmin.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: employmentType.id,
          job_posting_state_id: postingState.id,
          title: postingTitle,
          description: postingDescription,
          location,
          salary_range_min: salaryMin,
          salary_range_max: salaryMax,
          application_deadline: applicationDeadline,
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 7. Search for job postings using no filters (should include the new posting)
  const listResult =
    await api.functional.atsRecruitment.systemAdmin.jobPostings.index(
      connection,
      {
        body: {} satisfies IAtsRecruitmentJobPosting.IRequest,
      },
    );
  typia.assert(listResult);
  TestValidator.predicate(
    "newly created job posting is in result set (no filters)",
    !!listResult.data.find((p) => p.id === jobPosting.id),
  );

  // 8. Search by filters (by HR recruiter, employment type, state, visibility, and title exact)
  const filterResult =
    await api.functional.atsRecruitment.systemAdmin.jobPostings.index(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: employmentType.id,
          job_posting_state_id: postingState.id,
          is_visible: true,
          title: postingTitle,
        } satisfies IAtsRecruitmentJobPosting.IRequest,
      },
    );
  typia.assert(filterResult);
  TestValidator.predicate(
    "filtering returns the correct posting",
    !!filterResult.data.find((p) => p.id === jobPosting.id),
  );

  // 9. Test partial title search (substring search for partial matching)
  const partialTitle = RandomGenerator.substring(postingTitle);
  const partialTitleResult =
    await api.functional.atsRecruitment.systemAdmin.jobPostings.index(
      connection,
      {
        body: {
          title: partialTitle,
        } satisfies IAtsRecruitmentJobPosting.IRequest,
      },
    );
  typia.assert(partialTitleResult);
  TestValidator.predicate(
    "partial title search returns posting",
    !!partialTitleResult.data.find((p) => p.id === jobPosting.id),
  );

  // 10. Negative filter test: using definitely non-matching recruiter UUID
  let wrongRecruiterId: string & tags.Format<"uuid">;
  do {
    wrongRecruiterId = typia.random<string & tags.Format<"uuid">>();
  } while (wrongRecruiterId === hrRecruiter.id);
  const negativeResult =
    await api.functional.atsRecruitment.systemAdmin.jobPostings.index(
      connection,
      {
        body: {
          hr_recruiter_id: wrongRecruiterId,
        } satisfies IAtsRecruitmentJobPosting.IRequest,
      },
    );
  typia.assert(negativeResult);
  TestValidator.equals(
    "search with non-matching recruiter returns nothing",
    negativeResult.data.length,
    0,
  );

  // 11. Pagination edge: limit = 1
  const paginationPage1 =
    await api.functional.atsRecruitment.systemAdmin.jobPostings.index(
      connection,
      {
        body: {
          limit: 1 as number & tags.Type<"int32">,
          page: 1 as number & tags.Type<"int32">,
        } satisfies IAtsRecruitmentJobPosting.IRequest,
      },
    );
  typia.assert(paginationPage1);
  TestValidator.equals(
    "pagination limit 1 returns 1 record or less",
    paginationPage1.data.length <= 1,
    true,
  );
}
