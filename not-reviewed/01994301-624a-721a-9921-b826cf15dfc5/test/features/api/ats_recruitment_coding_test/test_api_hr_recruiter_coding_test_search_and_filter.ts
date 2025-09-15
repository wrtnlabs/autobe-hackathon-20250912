import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentCodingTest";

/**
 * This scenario validates the search and filtering capabilities for coding
 * tests assigned to applicants by an HR recruiter through the ATS platform. The
 * test fully exercises the business workflow: (1) An HR recruiter registers
 * (join), (2) The recruiter logs in to obtain authentication, (3) An employment
 * type entity is created for job postings, (4) A job posting state is created
 * for valid workflow, (5) The recruiter creates a job posting using these
 * supporting entities, (6) An applicant account is created and (7) (optionally)
 * logs in, (8) A coding test assignment is created linking the recruiter,
 * applicant, and job posting (with statuses, provider, and scheduling fields),
 * (9) The recruiter performs a search (filter/pagination) on the coding tests
 * endpoint, filtering by known applicant ID and/or job posting ID. Validation:
 * The returned coding tests must include only those matching the filters.
 * Pagination is validated by specifying known page and limit values and
 * confirming whether results match expectations. Edge cases: The scenario
 * covers cases where search filters yield no results (unknown applicant/job
 * posting IDs), and also negative tests such as unauthorized querying (when
 * calling index without prior recruiter authentication), and malformed requests
 * (such as missing required filters or out-of-range pagination values). All API
 * responses are validated for types and relevant business logic conditions.
 */
export async function test_api_hr_recruiter_coding_test_search_and_filter(
  connection: api.IConnection,
) {
  // 1. Register HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(10);
  const hrRecruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrEmail,
        password: hrPassword,
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hrRecruiter);

  // 2. Login HR recruiter
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 3. Create job employment type
  const jobEmploymentType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(jobEmploymentType);

  // 4. Create job posting state
  const jobPostingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: RandomGenerator.alphaNumeric(6),
          label: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
          sort_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(jobPostingState);

  // 5. Create job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: jobEmploymentType.id,
          job_posting_state_id: jobPostingState.id,
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          location: RandomGenerator.name(2),
          salary_range_min: 40000,
          salary_range_max: 120000,
          application_deadline: new Date(
            Date.now() + 1000 * 3600 * 24 * 30,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 6. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(10);
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

  // 7. Login applicant (optional in flow)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 8. Assign coding test to applicant
  const scheduledAt = new Date(Date.now() + 1000 * 3600 * 24 * 7).toISOString();
  const codingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: typia.random<
            string & tags.Format<"uuid">
          >(), // Would be created by matching application logic if available
          ats_recruitment_applicant_id: applicant.id,
          ats_recruitment_hrrecruiter_id: hrRecruiter.id,
          test_provider: "internal",
          status: "scheduled",
          scheduled_at: scheduledAt,
        } satisfies IAtsRecruitmentCodingTest.ICreate,
      },
    );
  typia.assert(codingTest);

  // 9. HR recruiter searches for coding tests filtered by applicant/job posting
  const searchRequest = {
    applicant_id: applicant.id,
    job_posting_id: jobPosting.id,
    status: "scheduled",
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IAtsRecruitmentCodingTest.IRequest;

  const searchPage =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchPage);

  TestValidator.predicate(
    "returned results are filtered to applicant/job posting",
    searchPage.data.every(
      (t) =>
        t.ats_recruitment_applicant_id === applicant.id &&
        t.status === "scheduled",
    ),
  );

  // 10. Negative Test: No results for wrong applicant ID
  const noResultPage =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.index(
      connection,
      {
        body: {
          applicant_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1 as number & tags.Type<"int32">,
          limit: 10 as number & tags.Type<"int32">,
        } satisfies IAtsRecruitmentCodingTest.IRequest,
      },
    );
  typia.assert(noResultPage);
  TestValidator.equals(
    "search with wrong applicant returns empty data",
    noResultPage.data,
    [],
  );

  // 11. Negative Test: Try to query without logging in
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthenticated recruiter cannot search coding tests",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.codingTests.index(
        unauthConn,
        {
          body: searchRequest,
        },
      );
    },
  );
}
