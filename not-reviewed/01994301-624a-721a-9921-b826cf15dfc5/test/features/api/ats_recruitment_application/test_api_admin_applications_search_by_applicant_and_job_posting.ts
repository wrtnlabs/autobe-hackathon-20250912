import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentApplication";

/**
 * Verifies that a system administrator can search ATS applications filtered by
 * both applicant_id and job_posting_id, validating normal and edge scenarios.
 * Covers end-to-end workflow including authentication for multiple roles,
 * entity creation, and search API validation.
 *
 * 1. Register and authenticate a new system administrator
 * 2. Register and authenticate a new applicant
 * 3. System admin creates a new job posting
 * 4. Applicant applies to the job posting
 * 5. System admin searches for applications filtered by both applicant_id and
 *    job_posting_id—expect exactly the created application
 * 6. Search with invalid (random) applicant ID—expect empty results
 * 7. Search with invalid (random) job posting ID—expect empty results
 * 8. Search with mismatched (random) valid IDs—expect empty results
 * 9. Search with no filters—expect created application present among results
 * 10. Attempt search as applicant (not admin)—expect error (authorization failure)
 */
export async function test_api_admin_applications_search_by_applicant_and_job_posting(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        super_admin: false,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register and authenticate as applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        name: RandomGenerator.name(),
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
  typia.assert(applicant);

  // 3. Switch to system admin and create a job posting
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });

  // Generate required foreign keys for job posting creation
  const hrRecruiterId = typia.random<string & tags.Format<"uuid">>();
  const jobEmploymentTypeId = typia.random<string & tags.Format<"uuid">>();
  const jobPostingStateId = typia.random<string & tags.Format<"uuid">>();
  const jobPosting: IAtsRecruitmentJobPosting =
    await api.functional.atsRecruitment.systemAdmin.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiterId,
          job_employment_type_id: jobEmploymentTypeId,
          job_posting_state_id: jobPostingStateId,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 4. Switch to applicant and submit an application
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

  // 5. Switch back to system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });

  // 6. Search applications filtered by applicant and job posting (should return one application)
  const filteredResult =
    await api.functional.atsRecruitment.systemAdmin.applications.index(
      connection,
      {
        body: {
          applicant_id: applicant.id,
          job_posting_id: jobPosting.id,
        } satisfies IAtsRecruitmentApplication.IRequest,
      },
    );
  typia.assert(filteredResult);
  TestValidator.predicate(
    "filtered result contains exactly one record",
    filteredResult.data.length === 1,
  );
  TestValidator.equals(
    "returned application id matches created application",
    filteredResult.data[0].id,
    application.id,
  );

  // 7. Search with invalid applicant ID (random)
  const invalidApplicantResult =
    await api.functional.atsRecruitment.systemAdmin.applications.index(
      connection,
      {
        body: {
          applicant_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_id: jobPosting.id,
        } satisfies IAtsRecruitmentApplication.IRequest,
      },
    );
  typia.assert(invalidApplicantResult);
  TestValidator.equals(
    "search with invalid applicant yields empty result",
    invalidApplicantResult.data.length,
    0,
  );

  // 8. Search with invalid job posting ID (random)
  const invalidJobPostingResult =
    await api.functional.atsRecruitment.systemAdmin.applications.index(
      connection,
      {
        body: {
          applicant_id: applicant.id,
          job_posting_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAtsRecruitmentApplication.IRequest,
      },
    );
  typia.assert(invalidJobPostingResult);
  TestValidator.equals(
    "search with invalid job posting yields empty result",
    invalidJobPostingResult.data.length,
    0,
  );

  // 9. Search with mismatched (random) valid IDs (should yield empty result)
  const mismatchedResult =
    await api.functional.atsRecruitment.systemAdmin.applications.index(
      connection,
      {
        body: {
          applicant_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAtsRecruitmentApplication.IRequest,
      },
    );
  typia.assert(mismatchedResult);
  TestValidator.equals(
    "search with mismatched IDs yields empty result",
    mismatchedResult.data.length,
    0,
  );

  // 10. Search with no filters (should return at least the created application somewhere)
  const allResult =
    await api.functional.atsRecruitment.systemAdmin.applications.index(
      connection,
      {
        body: {} satisfies IAtsRecruitmentApplication.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.predicate(
    "all-applications search contains created application",
    allResult.data.some((x) => x.id === application.id),
  );

  // 11. Attempt application search as applicant (should fail)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "application search as non-admin should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.applications.index(
        connection,
        {
          body: {
            applicant_id: applicant.id,
            job_posting_id: jobPosting.id,
          } satisfies IAtsRecruitmentApplication.IRequest,
        },
      );
    },
  );
}
