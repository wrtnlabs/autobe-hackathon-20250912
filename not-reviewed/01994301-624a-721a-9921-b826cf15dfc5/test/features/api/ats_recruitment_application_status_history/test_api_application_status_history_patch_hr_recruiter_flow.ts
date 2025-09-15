import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentApplicationStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationStatusHistory";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentApplicationStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentApplicationStatusHistory";

/**
 * E2E test for HR recruiter viewing/patching application status history.
 *
 * Validates that an HR recruiter can view (PATCH
 * /atsRecruitment/hrRecruiter/applications/:applicationId/statusHistories)
 * the status history pipeline for an application, while observing proper
 * authorization, application existence, and business ownership. Covers
 * successful retrieval, as well as negative business cases (e.g., wrong
 * user, bad parameters).
 *
 * 1. Register HR recruiter (unique email)
 * 2. Login as HR recruiter (explicit auth context)
 * 3. Register applicant (unique email)
 * 4. Login as applicant
 * 5. HR recruiter creates a job posting (random title, description,
 *    visibility, required business fields). Record posting and recruiter
 *    ID.
 * 6. Applicant creates an application for the posted job
 * 7. Login as HR recruiter for patch operation
 * 8. HR recruiter patches (lists) status history for application using PATCH
 *    /atsRecruitment/hrRecruiter/applications/:applicationId/statusHistories
 *
 *    - Use body: { application_id: <applicationId> } (IRequest type)
 *    - Validate that returned status history is for correct application and not
 *         empty
 * 9. Negative test: Attempt with wrong applicationId
 * 10. Negative test: Attempt as applicant (should fail permission check)
 * 11. Negative test: No application_id in body (should still work as filtering
 *     is optional, but if required, fails gracefully).
 */
export async function test_api_application_status_history_patch_hr_recruiter_flow(
  connection: api.IConnection,
) {
  // 1. Register HR recruiter
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

  // 2. Login as HR recruiter
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 3. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // 4. Login as applicant
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 5. HR recruiter creates job posting
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
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
          location: RandomGenerator.paragraph({ sentences: 2 }),
          salary_range_min: 55000,
          salary_range_max: 120000,
          application_deadline: new Date(
            Date.now() + 86400000 * 30,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 6. Applicant creates application for that job
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

  // 7. Login as HR recruiter for patch/view status history
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 8. HR recruiter patches (lists) status history for application
  const statusHistories =
    await api.functional.atsRecruitment.hrRecruiter.applications.statusHistories.index(
      connection,
      {
        applicationId: application.id,
        body: {
          application_id: application.id,
        } satisfies IAtsRecruitmentApplicationStatusHistory.IRequest,
      },
    );
  typia.assert(statusHistories);
  TestValidator.equals(
    "application id matches search",
    statusHistories.data.every((s) => s.application_id === application.id),
    true,
  );
  TestValidator.predicate(
    "status history not empty",
    statusHistories.data.length > 0,
  );

  // 9. Negative test: wrong applicationId (should return empty or fail)
  const badHistories =
    await api.functional.atsRecruitment.hrRecruiter.applications.statusHistories.index(
      connection,
      {
        applicationId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          application_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAtsRecruitmentApplicationStatusHistory.IRequest,
      },
    );
  typia.assert(badHistories);
  TestValidator.equals(
    "no status history returned for bad id",
    badHistories.data.length,
    0,
  );

  // 10. Negative test: as applicant (should fail with permission error)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "applicant forbidden from viewing HR history",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.statusHistories.index(
        connection,
        {
          applicationId: application.id,
          body: {
            application_id: application.id,
          } satisfies IAtsRecruitmentApplicationStatusHistory.IRequest,
        },
      );
    },
  );
  // 11. Negative test: no application_id in body (should return all or filtered response)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const allHistories =
    await api.functional.atsRecruitment.hrRecruiter.applications.statusHistories.index(
      connection,
      {
        applicationId: application.id,
        body: {} satisfies IAtsRecruitmentApplicationStatusHistory.IRequest,
      },
    );
  typia.assert(allHistories);
  TestValidator.predicate(
    "history for known application present",
    allHistories.data.some((h) => h.application_id === application.id),
  );
}
