import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentApplication";

/**
 * Validates that an HR recruiter can retrieve the full details of a specific
 * job application by its applicationId. The scenario ensures end-to-end
 * coverage by:
 *
 * 1. Authenticating as an HR recruiter
 * 2. Creating both an applicant and job posting
 * 3. Having the applicant file an application for the job posting
 * 4. Searching as the recruiter to fetch the applicationId
 * 5. Retrieving the full application details
 * 6. Verifying core business fields match expectations
 * 7. Ensuring error for non-existent/deleted applicationId
 * 8. Testing permission denied for unauthorized or logged-out users This ensures
 *    security, correctness, and business rule adherence in the application
 *    retrieval endpoint.
 */
export async function test_api_application_retrieve_by_id_hr_recruiter(
  connection: api.IConnection,
) {
  // 1. Register HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hrRecruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrEmail,
        password: hrPassword,
        name: RandomGenerator.name(),
        department: RandomGenerator.name(1),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hrRecruiter);

  // 2. Register Applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
  typia.assert(applicant);

  // 3. HR recruiter logs in, creates job posting
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const jobPosting: IAtsRecruitmentJobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          location: RandomGenerator.paragraph({ sentences: 1 }),
          salary_range_min: 30000000,
          salary_range_max: 80000000,
          application_deadline: new Date(
            Date.now() + 86400000 * 14,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 4. Applicant logs in and applies to job
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const application: IAtsRecruitmentApplication =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 5. HR recruiter logs back in
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  // 6. Find applicationId via search
  const searchResult =
    await api.functional.atsRecruitment.hrRecruiter.applications.index(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
          applicant_id: applicant.id,
          page: 1,
          limit: 10,
        } satisfies IAtsRecruitmentApplication.IRequest,
      },
    );
  typia.assert(searchResult);
  const fetchedSummary = searchResult.data.find(
    (app) => app.id === application.id,
  );
  typia.assertGuard(fetchedSummary!);
  const applicationId = typia.assert(fetchedSummary!.id);

  // 7. Retrieve application by ID
  const retrieved: IAtsRecruitmentApplication =
    await api.functional.atsRecruitment.hrRecruiter.applications.at(
      connection,
      {
        applicationId,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved application ID should match created",
    retrieved.id,
    application.id,
  );
  TestValidator.equals(
    "applicant_id matches",
    retrieved.applicant_id,
    applicant.id,
  );
  TestValidator.equals(
    "job_posting_id matches",
    retrieved.job_posting_id,
    jobPosting.id,
  );

  // 8. Error: fetch non-existent applicationId
  const invalidId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching non-existent applicationId fails",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.at(
        connection,
        {
          applicationId: invalidId,
        },
      );
    },
  );

  // 9. Logout (simulate by clearing token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "permission denied after recruiter logout",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.at(
        unauthConn,
        {
          applicationId,
        },
      );
    },
  );

  // 10. Applicant tries to fetch application details (should fail)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "applicant cannot fetch details from recruiter endpoint",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.at(
        connection,
        {
          applicationId,
        },
      );
    },
  );
}
