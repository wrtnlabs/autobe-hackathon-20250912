import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentApplicationStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationStatusHistory";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentApplicationStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentApplicationStatusHistory";

/**
 * E2E test that validates technical reviewer access and detail query of status
 * history for applications.
 *
 * 1. Register a tech reviewer, HR recruiter, and applicant with random values.
 * 2. HR recruiter posts a job posting.
 * 3. Applicant applies to job posting.
 * 4. Tech reviewer logs in (role switch), queries for status histories for the
 *    application.
 * 5. Verifies that entries exist (if any) and have correct application_id, correct
 *    actor_id (where available).
 * 6. Verifies that unauthorized/invalid access or filter yields expected
 *    error/result.
 */
export async function test_api_application_status_history_patch_tech_reviewer(
  connection: api.IConnection,
) {
  // Register HR recruiter and login for posting job
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPwd = RandomGenerator.alphaNumeric(12);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPwd,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  // Create job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // Register applicant and login
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPwd = RandomGenerator.alphaNumeric(12);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPwd,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // Applicant creates application
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

  // Register tech reviewer and login
  const techEmail = typia.random<string & tags.Format<"email">>();
  const techPwd = RandomGenerator.alphaNumeric(12);
  const techReviewer = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: techEmail,
      password: techPwd,
      name: RandomGenerator.name(),
      specialization: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  typia.assert(techReviewer);

  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: techEmail,
      password: techPwd,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });

  // Tech reviewer queries for status history on the created application
  const audit =
    await api.functional.atsRecruitment.techReviewer.applications.statusHistories.index(
      connection,
      {
        applicationId: application.id,
        body: {
          application_id: application.id,
        } satisfies IAtsRecruitmentApplicationStatusHistory.IRequest,
      },
    );
  typia.assert(audit);

  // Validate result has right application_id, at least one record and correct shape
  TestValidator.predicate(
    "Status history is NOT empty and matches application_id",
    audit.data.length > 0 &&
      audit.data.every((r) => r.application_id === application.id),
  );

  // Fail: Try to query a non-existent application status history
  await TestValidator.error(
    "Tech reviewer queries non-existent application should fail or return empty",
    async () => {
      await api.functional.atsRecruitment.techReviewer.applications.statusHistories.index(
        connection,
        {
          applicationId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            application_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IAtsRecruitmentApplicationStatusHistory.IRequest,
        },
      );
    },
  );
}
