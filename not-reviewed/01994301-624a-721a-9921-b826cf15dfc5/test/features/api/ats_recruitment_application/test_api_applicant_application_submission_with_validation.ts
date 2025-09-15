import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentResume";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test verifying job application submission, foreign key validation,
 * duplicate prevention, and error cases.
 *
 * Steps:
 *
 * 1. Register and login as applicant
 * 2. Upload new resume
 * 3. Register and login as HR recruiter
 * 4. Create job posting (employment type/state IDs random for test)
 * 5. Switch applicant, submit valid application
 * 6. Validate correct application result returned
 * 7. Try non-existent job posting (should fail)
 * 8. Try non-existent resume (should fail)
 * 9. Try duplicate application (should fail)
 */
export async function test_api_applicant_application_submission_with_validation(
  connection: api.IConnection,
) {
  // 1. Register and login as applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(10);
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      },
    });
  typia.assert(applicant);

  // 2. Upload resume
  const resume: IAtsRecruitmentResume =
    await api.functional.atsRecruitment.applicant.resumes.create(connection, {
      body: {
        title: RandomGenerator.name(2),
        parsed_name: RandomGenerator.name(),
        parsed_email: typia.random<string & tags.Format<"email">>(),
        parsed_mobile: RandomGenerator.mobile(),
        skills_json: JSON.stringify([
          RandomGenerator.name(1),
          RandomGenerator.name(1),
        ]),
      },
    });
  typia.assert(resume);
  const resumeId = resume.id;
  const applicantId = applicant.id;

  // 3. Register and login as recruiter
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = RandomGenerator.alphaNumeric(12);
  const recruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: recruiterEmail,
        password: recruiterPassword,
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 1 }),
      },
    });
  typia.assert(recruiter);

  // 4. Create job posting
  const job_employment_type_id = typia.random<string & tags.Format<"uuid">>();
  const job_posting_state_id = typia.random<string & tags.Format<"uuid">>();
  const jobPosting: IAtsRecruitmentJobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: recruiter.id,
          job_employment_type_id,
          job_posting_state_id,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          is_visible: true,
          location: RandomGenerator.paragraph({ sentences: 2 }),
          salary_range_min: 47000000,
          salary_range_max: 67000000,
          application_deadline: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        },
      },
    );
  typia.assert(jobPosting);
  const postingId = jobPosting.id;

  // 5. Switch back to applicant (login again)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    },
  });

  // 6. Valid application
  const application: IAtsRecruitmentApplication =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: postingId,
          resume_id: resumeId,
        },
      },
    );
  typia.assert(application);
  TestValidator.equals(
    "applicant_id matches",
    application.applicant_id,
    applicantId,
  );
  TestValidator.equals(
    "job_posting_id matches",
    application.job_posting_id,
    postingId,
  );
  TestValidator.equals("resume_id matches", application.resume_id, resumeId);
  TestValidator.predicate(
    "application current_status is string",
    typeof application.current_status === "string",
  );

  // 7. Application to fake posting (should fail)
  const fakePostingId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "application to non-existent posting must fail",
    async () => {
      await api.functional.atsRecruitment.applicant.applications.create(
        connection,
        {
          body: {
            job_posting_id: fakePostingId,
            resume_id: resumeId,
          },
        },
      );
    },
  );

  // 8. Application to fake resume (should fail)
  const fakeResumeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "application to non-existent resume must fail",
    async () => {
      await api.functional.atsRecruitment.applicant.applications.create(
        connection,
        {
          body: {
            job_posting_id: postingId,
            resume_id: fakeResumeId,
          },
        },
      );
    },
  );

  // 9. Duplicate application (should fail)
  await TestValidator.error(
    "duplicate application for same posting must fail",
    async () => {
      await api.functional.atsRecruitment.applicant.applications.create(
        connection,
        {
          body: {
            job_posting_id: postingId,
            resume_id: resumeId,
          },
        },
      );
    },
  );
}
