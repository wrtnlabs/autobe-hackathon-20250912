import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentResume";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for updating an existing coding test as an HR recruiter. The test
 * follows this workflow:
 *
 * 1. Register and login as HR recruiter
 * 2. Register applicant
 * 3. Create job employment type
 * 4. Create job posting state
 * 5. Create job posting
 * 6. Applicant uploads resume
 * 7. Applicant applies to job posting
 * 8. HR creates coding test for application
 * 9. HR updates coding test's fields (provider, scheduled_at)
 * 10. Assert that update took effect
 * 11. Negative test: try update with wrong codingTestId
 * 12. Negative test: try update as unauthorized (applicant) account
 */
export async function test_api_coding_test_update_by_hr_e2e(
  connection: api.IConnection,
) {
  // 1. HR recruiter registration & login
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = "P@ssword123";
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.name(1),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  // 2. Applicant registration
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = "S3cretpwd!";
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // 3. Job employment type (created as HR)
  const jobEmploymentType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph(),
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(jobEmploymentType);

  // 4. Job posting state
  const stateCode = RandomGenerator.alphaNumeric(6);
  const jobPostingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: stateCode,
          label: RandomGenerator.paragraph({ sentences: 1, wordMin: 4 }),
          description: RandomGenerator.paragraph(),
          is_active: true,
          sort_order: 1,
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(jobPostingState);

  // 5. Create job posting (HR recruiter)
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: jobEmploymentType.id,
          job_posting_state_id: jobPostingState.id,
          title: `Developer ${RandomGenerator.alphaNumeric(4)}`,
          description: RandomGenerator.content({ paragraphs: 2 }),
          location: "Seoul",
          is_visible: true,
          salary_range_min: 50000000,
          salary_range_max: 90000000,
          application_deadline: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 10,
          ).toISOString(),
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 6. Switch to applicant: login (applicant context required for resume/application)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 7. Applicant uploads resume
  const resume = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        parsed_name: RandomGenerator.name(),
        parsed_email: typia.random<string & tags.Format<"email">>(),
        parsed_mobile: RandomGenerator.mobile(),
        parsed_birthdate: "1990-01-01",
        parsed_education_summary: RandomGenerator.paragraph(),
        parsed_experience_summary: RandomGenerator.paragraph(),
        skills_json: JSON.stringify(["typescript", "nodejs", "sql"]),
      } satisfies IAtsRecruitmentResume.ICreate,
    },
  );
  typia.assert(resume);

  // 8. Applicant applies for job posting (link application to both applicant and job)
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
          resume_id: resume.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 9. Switch to HR recruiter for coding test actions
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 10. HR creates coding test
  const codingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          ats_recruitment_applicant_id: applicant.id,
          ats_recruitment_hrrecruiter_id: hrRecruiter.id,
          test_provider: "internal",
          scheduled_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24,
          ).toISOString(), // 1 day from now
          status: "scheduled",
        } satisfies IAtsRecruitmentCodingTest.ICreate,
      },
    );
  typia.assert(codingTest);

  // 11. HR updates coding test (change provider, status, url, scheduled_at)
  const updateBody = {
    test_provider: "codesignal",
    test_url: "https://codesignal.com/test/" + RandomGenerator.alphaNumeric(8),
    scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), // +2 days
    status: "delivered",
  } satisfies IAtsRecruitmentCodingTest.IUpdate;

  const updatedTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.update(
      connection,
      {
        codingTestId: codingTest.id,
        body: updateBody,
      },
    );
  typia.assert(updatedTest);
  TestValidator.equals(
    "Updated test_provider",
    updatedTest.test_provider,
    "codesignal",
  );
  TestValidator.equals("Updated status", updatedTest.status, "delivered");
  TestValidator.equals(
    "Updated test_url",
    updatedTest.test_url,
    updateBody.test_url,
  );
  TestValidator.equals(
    "Updated scheduled_at",
    updatedTest.scheduled_at,
    updateBody.scheduled_at,
  );

  // 12. Negative Test: invalid codingTestId
  await TestValidator.error(
    "Update with invalid codingTestId should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.codingTests.update(
        connection,
        {
          codingTestId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );

  // 13. Negative Test: applicant (unauthorized) cannot update coding test
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  await TestValidator.error("Applicant cannot update coding test", async () => {
    await api.functional.atsRecruitment.hrRecruiter.codingTests.update(
      connection,
      {
        codingTestId: codingTest.id,
        body: updateBody,
      },
    );
  });
}
