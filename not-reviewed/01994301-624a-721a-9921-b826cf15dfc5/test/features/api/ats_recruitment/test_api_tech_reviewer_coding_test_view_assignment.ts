import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test that a technical reviewer can retrieve a specific assigned coding test
 * for evaluation purposes. Checks correct visibility, access control, and
 * response content. Steps:
 *
 * 1. Register tech reviewer, HR recruiter, and applicant
 * 2. HR creates job posting
 * 3. Applicant applies
 * 4. HR assigns coding test
 * 5. Tech reviewer logs in and GETs that coding test
 * 6. Assert correct IDs and properties; error case for non-existent ID.
 */
export async function test_api_tech_reviewer_coding_test_view_assignment(
  connection: api.IConnection,
) {
  // 1. Register technical reviewer
  const reviewerPassword = RandomGenerator.alphaNumeric(10);
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerJoin = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
      name: RandomGenerator.name(),
      specialization: "Backend",
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  typia.assert(reviewerJoin);

  // 2. Register HR recruiter
  const recruiterPassword = RandomGenerator.alphaNumeric(10);
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterJoin = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
      name: RandomGenerator.name(),
      department: "Engineering",
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiterJoin);

  // 3. Register applicant
  const applicantPassword = RandomGenerator.alphaNumeric(10);
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantJoin = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicantJoin);

  // 4. HR recruiter login (ensure active session)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 5. Create job posting
  const jobPost =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: recruiterJoin.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPost);

  // 6. Applicant login and submit application
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPost.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 7. HR recruiter login (to assign coding test)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 8. HR assigns a coding test
  const codingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          ats_recruitment_applicant_id: applicantJoin.id,
          ats_recruitment_hrrecruiter_id: recruiterJoin.id,
          test_provider: "internal",
          scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          status: "scheduled",
          // Optionals omitted for directness
        } satisfies IAtsRecruitmentCodingTest.ICreate,
      },
    );
  typia.assert(codingTest);

  // 9. Tech reviewer login (ensure we act as tech reviewer)
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });

  // 10. Reviewer GETs coding test assignment
  const got = await api.functional.atsRecruitment.techReviewer.codingTests.at(
    connection,
    {
      codingTestId: codingTest.id,
    },
  );
  typia.assert(got);
  TestValidator.equals("coding test ID should match", got.id, codingTest.id);
  TestValidator.equals(
    "application ID matches",
    got.ats_recruitment_application_id,
    application.id,
  );
  TestValidator.equals(
    "applicant ID matches",
    got.ats_recruitment_applicant_id,
    applicantJoin.id,
  );
  TestValidator.equals(
    "HR recruiter ID matches",
    got.ats_recruitment_hrrecruiter_id,
    recruiterJoin.id,
  );
  TestValidator.equals(
    "test provider is internal",
    got.test_provider,
    "internal",
  );

  // 11. Attempt to GET a coding test with an invalid ID (should yield error)
  await TestValidator.error(
    "retrieving non-existent coding test should fail",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.at(
        connection,
        {
          codingTestId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
