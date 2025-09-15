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
 * End-to-end test for coding test deletion by HR recruiter in ATS.
 *
 * This test ensures:
 *
 * 1. HR recruiter and applicant are correctly registered and can login.
 * 2. Essential job posting dependencies are created (employment type and posting
 *    state).
 * 3. An applicant successfully applies for a job and receives a coding test
 *    assignment.
 * 4. The HR recruiter is able to delete the coding test.
 * 5. Deleting an already deleted or non-existent coding test fails as expected.
 * 6. Deleting a coding test by an unauthorized (applicant) user fails.
 *
 * Steps:
 *
 * - Register an HR recruiter & login.
 * - Create job employment type and state.
 * - Create a job posting.
 * - Register and login an applicant.
 * - Applicant creates a resume.
 * - Applicant applies for a job.
 * - HR recruiter creates and assigns a coding test.
 * - HR recruiter deletes the coding test and verifies deletion.
 * - All error, permission, and edge scenarios are validated.
 */
export async function test_api_coding_test_deletion_e2e(
  connection: api.IConnection,
) {
  // HR recruiter registration
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.name(1),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  // Employment type setup
  const employmentType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: "Full-Time " + RandomGenerator.alphabets(6),
          description: "Standard full-time employment.",
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(employmentType);

  // Job posting state setup
  const postingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: RandomGenerator.alphaNumeric(6),
          label: "Open",
          description: "Job is open for applications.",
          is_active: true,
          sort_order: 1,
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(postingState);

  // HR recruiter creates job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: employmentType.id,
          job_posting_state_id: postingState.id,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 4,
          }),
          location: null,
          salary_range_min: 3500,
          salary_range_max: 6000,
          application_deadline: new Date(
            Date.now() + 14 * 86400000,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // Applicant registration & login
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // Applicant creates resume
  const resume = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        parsed_name: RandomGenerator.name(),
        parsed_email: applicantEmail,
        parsed_mobile: RandomGenerator.mobile(),
        parsed_education_summary: "B.S. Computer Science, SNU",
        skills_json: JSON.stringify(["TypeScript", "Node.js", "Recruitment"]),
      } satisfies IAtsRecruitmentResume.ICreate,
    },
  );
  typia.assert(resume);

  // Applicant applies for job
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

  // Switch back to HR recruiter role
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // HR recruiter assigns coding test
  const scheduledAt = new Date(Date.now() + 86400000).toISOString();
  const codingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          ats_recruitment_applicant_id: applicant.id,
          ats_recruitment_hrrecruiter_id: hrRecruiter.id,
          test_provider: "internal",
          test_external_id: null,
          test_url: null,
          scheduled_at: scheduledAt,
          delivered_at: null,
          status: "scheduled",
          expiration_at: null,
          callback_received_at: null,
          closed_at: null,
        } satisfies IAtsRecruitmentCodingTest.ICreate,
      },
    );
  typia.assert(codingTest);

  // HR recruiter deletes coding test
  await api.functional.atsRecruitment.hrRecruiter.codingTests.erase(
    connection,
    {
      codingTestId: codingTest.id,
    },
  );

  // Try deleting again (should error)
  await TestValidator.error(
    "Deleting already deleted codingTest fails",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.codingTests.erase(
        connection,
        {
          codingTestId: codingTest.id,
        },
      );
    },
  );

  // Switch to applicant and try deleting coding test (forbidden)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "Applicant cannot delete codingTest (forbidden)",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.codingTests.erase(
        connection,
        {
          codingTestId: codingTest.id,
        },
      );
    },
  );

  // Try to delete non-existent coding test as HR recruiter
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Deleting non-existent codingTest fails",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.codingTests.erase(
        connection,
        {
          codingTestId: randomId,
        },
      );
    },
  );
}
