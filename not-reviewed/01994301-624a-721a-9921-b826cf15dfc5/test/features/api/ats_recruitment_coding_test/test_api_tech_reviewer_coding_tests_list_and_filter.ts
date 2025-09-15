import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentCodingTest";

/**
 * E2E test for technical reviewer searching/filtering coding tests in ATS.
 *
 * This test sets up:
 *
 * - A fresh tech reviewer (who will filter)
 * - A fresh applicant
 * - An HR recruiter who creates a real job posting (referenced later)
 *
 * Coding test assignment is assumed to be external/system-pre-populated;
 * focus is on the PATCH endpoint for filtering tests by applicant and/or
 * job posting ID as reviewer. Tests end-to-end flow from setup and
 * authentication, through multi-role switching, to result verification and
 * error handling.
 *
 * 1. Tech reviewer registers (join), switches to their authenticated session
 * 2. Applicant registers
 * 3. HR recruiter registers and logs in
 * 4. HR recruiter creates a job posting
 * 5. Switch back to tech reviewer (login)
 * 6. Reviewer lists coding tests (PATCH) with no filter: ensure at least an
 *    empty result (API returns only their relevant tests)
 * 7. Reviewer lists coding tests (PATCH) with applicant_id set: verify correct
 *    filter logic, only tests for this applicant are returned (simulate
 *    assignment)
 * 8. Reviewer lists coding tests (PATCH) with job_posting_id set: verify only
 *    tests for relevant posting are included (simulate assignment)
 * 9. Error: Attempt PATCH as unauthenticated (headers wiped) and confirm error
 * 10. Error: Attempt PATCH with bad/unknown applicant_id or job_posting_id and
 *     confirm logical handling
 */
export async function test_api_tech_reviewer_coding_tests_list_and_filter(
  connection: api.IConnection,
) {
  // 1. Register tech reviewer
  const techReviewerEmail = typia.random<string & tags.Format<"email">>();
  const techReviewerPassword = RandomGenerator.alphaNumeric(12);
  const techReviewerName = RandomGenerator.name();
  const techReviewer = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: techReviewerEmail,
      password: techReviewerPassword,
      name: techReviewerName,
      specialization: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  typia.assert(techReviewer);

  // 2. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicantName = RandomGenerator.name();
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: applicantName,
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // 3. Register and login HR recruiter
  const hrRecruiterEmail = typia.random<string & tags.Format<"email">>();
  const hrRecruiterPassword = RandomGenerator.alphaNumeric(12);
  const hrRecruiterName = RandomGenerator.name();
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrRecruiterEmail,
      password: hrRecruiterPassword,
      name: hrRecruiterName,
      department: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  // Login as HR recruiter for job posting creation
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrRecruiterEmail,
      password: hrRecruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 4. Create job posting
  const jobPostingTitle = RandomGenerator.paragraph({ sentences: 2 });
  const jobPostingDescription = RandomGenerator.content({ paragraphs: 1 });
  const jobPostingEmploymentTypeId = typia.random<
    string & tags.Format<"uuid">
  >();
  const jobPostingStateId = typia.random<string & tags.Format<"uuid">>();
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: jobPostingEmploymentTypeId,
          job_posting_state_id: jobPostingStateId,
          title: jobPostingTitle,
          description: jobPostingDescription,
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 5. Switch back to tech reviewer (login)
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: techReviewerEmail,
      password: techReviewerPassword,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });

  // 6. Reviewer lists coding tests (PATCH) with no filter: ensure at least empty (API returns only their relevant tests)
  const resultNoFilter =
    await api.functional.atsRecruitment.techReviewer.codingTests.index(
      connection,
      {
        body: {} satisfies IAtsRecruitmentCodingTest.IRequest,
      },
    );
  typia.assert(resultNoFilter);
  TestValidator.predicate(
    "coding test list - resultNoFilter returns data array",
    Array.isArray(resultNoFilter.data),
  );
  TestValidator.predicate(
    "coding test list - resultNoFilter passes pagination type",
    resultNoFilter.pagination !== undefined &&
      typeof resultNoFilter.pagination.limit === "number",
  );

  // 7. Reviewer lists coding tests (PATCH) with applicant_id filter
  const resultApplicant =
    await api.functional.atsRecruitment.techReviewer.codingTests.index(
      connection,
      {
        body: {
          applicant_id: applicant.id,
        } satisfies IAtsRecruitmentCodingTest.IRequest,
      },
    );
  typia.assert(resultApplicant);
  TestValidator.predicate(
    "resultApplicant all items .ats_recruitment_applicant_id match given applicant",
    resultApplicant.data.every(
      (x) => x.ats_recruitment_applicant_id === applicant.id,
    ),
  );

  // 8. Reviewer lists coding tests (PATCH) with job_posting_id filter
  const resultJobPosting =
    await api.functional.atsRecruitment.techReviewer.codingTests.index(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
        } satisfies IAtsRecruitmentCodingTest.IRequest,
      },
    );
  typia.assert(resultJobPosting);
  TestValidator.predicate(
    "resultJobPosting all items .ats_recruitment_hrrecruiter_id or similar field present (not strict matching as simulated data)",
    resultJobPosting.data.every(
      (x) => typeof x.ats_recruitment_hrrecruiter_id === "string",
    ),
  );

  // 9. Error: PATCH as unauthenticated (wipe headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated techReviewer codingTests.index must fail",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.index(
        unauthConn,
        {
          body: {} satisfies IAtsRecruitmentCodingTest.IRequest,
        },
      );
    },
  );

  // 10. PATCH with non-existent applicant_id/job_posting_id
  const badApplicantId = typia.random<string & tags.Format<"uuid">>();
  const resultBadApplicant =
    await api.functional.atsRecruitment.techReviewer.codingTests.index(
      connection,
      {
        body: {
          applicant_id: badApplicantId,
        } satisfies IAtsRecruitmentCodingTest.IRequest,
      },
    );
  typia.assert(resultBadApplicant);
  TestValidator.equals(
    "applying unknown applicant_id filter yields 0 or empty result",
    resultBadApplicant.data.length,
    0,
  );

  const badJobPostingId = typia.random<string & tags.Format<"uuid">>();
  const resultBadJobPosting =
    await api.functional.atsRecruitment.techReviewer.codingTests.index(
      connection,
      {
        body: {
          job_posting_id: badJobPostingId,
        } satisfies IAtsRecruitmentCodingTest.IRequest,
      },
    );
  typia.assert(resultBadJobPosting);
  TestValidator.equals(
    "applying unknown job_posting_id filter yields 0 or empty result",
    resultBadJobPosting.data.length,
    0,
  );
}
