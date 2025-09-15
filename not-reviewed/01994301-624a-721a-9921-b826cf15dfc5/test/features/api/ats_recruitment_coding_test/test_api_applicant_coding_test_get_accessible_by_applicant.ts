import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E validation that an applicant can fetch only with their assigned
 * coding test instance via GET
 * /atsRecruitment/applicant/codingTests/{codingTestId}.
 *
 * - Ensures applicant can access only their test (positive case)
 * - Ensures access is denied for non-assigned/fake ids (negative cases)
 *
 * 1. Register an applicant user, storing email and password
 * 2. Register an HR recruiter, storing email and password
 * 3. HR recruiter creates job posting
 * 4. Applicant logs in and applies for job posting, creating an application
 * 5. HR recruiter logs in and assigns a coding test to the applicant's
 *    application
 * 6. Applicant logs in and fetches the assigned coding test by id
 * 7. Validate returned test has matching applicant, application, recruiter IDs
 * 8. Attempt to fetch a non-existent/fake coding test id and confirm error
 * 9. Register a second applicant, attempt to access the first applicant's
 *    coding test—should fail
 */
export async function test_api_applicant_coding_test_get_accessible_by_applicant(
  connection: api.IConnection,
) {
  // 1. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(10);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // 2. Register HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  // 3. HR recruiter creates job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 4. Applicant login and applies to job
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
          job_posting_id: jobPosting.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 5. HR recruiter login and assign coding test
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const codingTestCreateBody = {
    ats_recruitment_application_id: application.id,
    ats_recruitment_applicant_id: applicant.id,
    ats_recruitment_hrrecruiter_id: hrRecruiter.id,
    test_provider: "internal",
    scheduled_at: new Date().toISOString(),
    status: "scheduled",
  } satisfies IAtsRecruitmentCodingTest.ICreate;
  const codingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: codingTestCreateBody,
      },
    );
  typia.assert(codingTest);

  // 6. Applicant logs in and fetches coding test
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const fetchedCodingTest =
    await api.functional.atsRecruitment.applicant.codingTests.at(connection, {
      codingTestId: codingTest.id,
    });
  typia.assert(fetchedCodingTest);
  TestValidator.equals(
    "coding test assigned to correct applicant",
    fetchedCodingTest.ats_recruitment_applicant_id,
    applicant.id,
  );
  TestValidator.equals(
    "coding test application id is correct",
    fetchedCodingTest.ats_recruitment_application_id,
    application.id,
  );
  TestValidator.equals(
    "coding test recruiter id is correct",
    fetchedCodingTest.ats_recruitment_hrrecruiter_id,
    hrRecruiter.id,
  );

  // 7. Negative case: fetch a random (fake) coding test id
  await TestValidator.error(
    "applicant cannot access coding test with random id",
    async () => {
      await api.functional.atsRecruitment.applicant.codingTests.at(connection, {
        codingTestId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 8. Register 2nd applicant and try to fetch first applicant's coding test
  const secondApplicantEmail = typia.random<string & tags.Format<"email">>();
  const secondApplicantPassword = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.applicant.join(connection, {
    body: {
      email: secondApplicantEmail,
      password: secondApplicantPassword,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: secondApplicantEmail,
      password: secondApplicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "other applicants cannot access someone else's coding test",
    async () => {
      await api.functional.atsRecruitment.applicant.codingTests.at(connection, {
        codingTestId: codingTest.id,
      });
    },
  );
}
