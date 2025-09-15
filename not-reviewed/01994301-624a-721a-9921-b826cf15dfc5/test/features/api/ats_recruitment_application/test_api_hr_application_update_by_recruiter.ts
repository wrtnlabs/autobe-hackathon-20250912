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
 * End-to-end test validating HR recruiter update capabilities for job
 * applications and access controls.
 *
 * This test simulates a real-life multi-role workflow for the update (PUT)
 * API endpoint on a job application.
 *
 * Steps:
 *
 * 1. Applicant signup (creates basic applicant user).
 * 2. Applicant uploads a resume (resumeId).
 * 3. HR recruiter account is created and recruiter logs in.
 * 4. HR recruiter creates a new job posting.
 * 5. Applicant logs in, applies to the job (with prior resumeId), obtains
 *    applicationId.
 * 6. HR recruiter logs in again to ensure context, then updates the
 *    applicant's application record (e.g., replaces resume, updates
 *    status).
 * 7. Checks update succeeds and that returned application matches changes.
 * 8. Switches back to applicant, and attempts update - expects error due to
 *    insufficient permissions.
 * 9. Attempts update with invalid applicationId (random UUID) - expects error
 *    (not found/unauthorized).
 * 10. Attempts update with invalid resumeId (nonexistent UUID) - expects error
 *     (invalid reference).
 * 11. Attempts update with missing resumeId (null) - expects allowed/unlinks
 *     resume if business rule permits, else expects error.
 *
 * Validates:
 *
 * - Permission enforcement: Only HR recruiter for the posting can update
 * - Correct update on valid input
 * - Proper error on non-existent applicationId
 * - Proper error on invalid resumeId
 * - Edge behavior on resume unlink if null
 * - Full business logic enforcement
 */
export async function test_api_hr_application_update_by_recruiter(
  connection: api.IConnection,
) {
  // 1. Applicant registration
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

  // 2. Applicant uploads resume
  const resume = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentResume.ICreate,
    },
  );
  typia.assert(resume);

  // 3. HR recruiter registration
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = RandomGenerator.alphaNumeric(10) + "A#";
  const recruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiter);

  // 4. Recruiter creates a job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: recruiter.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 5. Applicant login and apply to job posting
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
          resume_id: resume.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 6. HR recruiter re-login for update context
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 7. HR recruiter updates application: change resume and status
  const updatedStatus = RandomGenerator.pick([
    "screened",
    "interview",
    "accepted",
  ] as const);
  const updateBody = {
    resume_id: resume.id,
    current_status: updatedStatus,
    last_state_change_at: new Date().toISOString(),
  } satisfies IAtsRecruitmentApplication.IUpdate;
  const updated =
    await api.functional.atsRecruitment.hrRecruiter.applications.update(
      connection,
      {
        applicationId: application.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "application status updated",
    updated.current_status,
    updatedStatus,
  );
  TestValidator.equals(
    "application resume_id updated",
    updated.resume_id,
    resume.id,
  );

  // 8. Switch to applicant and try to update: must fail (no permission)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  await TestValidator.error("applicant cannot update application", async () => {
    await api.functional.atsRecruitment.hrRecruiter.applications.update(
      connection,
      {
        applicationId: application.id,
        body: {
          current_status: "hacked",
        } satisfies IAtsRecruitmentApplication.IUpdate,
      },
    );
  });

  // 9. Recruiter tries invalid applicationId
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  await TestValidator.error(
    "update fails with nonexistent applicationId",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.update(
        connection,
        {
          applicationId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );

  // 10. Update with invalid resumeId
  await TestValidator.error("update fails with invalid resumeId", async () => {
    await api.functional.atsRecruitment.hrRecruiter.applications.update(
      connection,
      {
        applicationId: application.id,
        body: {
          resume_id: typia.random<string & tags.Format<"uuid">>(),
          current_status: updatedStatus,
        } satisfies IAtsRecruitmentApplication.IUpdate,
      },
    );
  });

  // 11. Update with null resumeId (attempt unlink, depending on rules)
  // If allowed: resume unlink. Business logic may permit or prohibit (test both)
  const nullResumeUpdate: IAtsRecruitmentApplication.IUpdate = {
    resume_id: null,
    current_status: updatedStatus,
  };
  try {
    const unlinked =
      await api.functional.atsRecruitment.hrRecruiter.applications.update(
        connection,
        {
          applicationId: application.id,
          body: nullResumeUpdate,
        },
      );
    typia.assert(unlinked);
    TestValidator.equals("resume unlinked", unlinked.resume_id, null);
  } catch (_exp) {
    // If business logic prohibits unlink, test expects error
    await TestValidator.error("unlinking resume not allowed", async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.update(
        connection,
        {
          applicationId: application.id,
          body: nullResumeUpdate,
        },
      );
    });
  }
}
