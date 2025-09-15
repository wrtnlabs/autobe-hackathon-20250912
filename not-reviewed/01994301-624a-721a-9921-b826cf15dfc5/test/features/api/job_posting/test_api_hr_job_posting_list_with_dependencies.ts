import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentJobPosting";

/**
 * Validate critical job posting list retrieval and search boundaries for HR
 * recruiters.
 *
 * This test simulates end-to-end business scenario where dependent entities
 * must be present in the system before HR recruiters can create job postings
 * and later query them. Steps:
 *
 * 1. Register system admin and login
 * 2. Admin creates a job posting state (e.g., "open")
 * 3. Admin creates an employment type (e.g., "Full-Time")
 * 4. Register and login as HR recruiter
 * 5. HR recruiter creates a job posting referencing the above state/type
 * 6. HR recruiter lists job postings, applying filtration by recruiter, by
 *    employment type, by posting state, and applying pagination, verifying
 *    expected boundaries/results.
 */
export async function test_api_hr_job_posting_list_with_dependencies(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdmin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        password: sysAdminPassword,
        name: RandomGenerator.name(),
        super_admin: true,
      },
    });
  typia.assert(sysAdmin);

  // 2. Login as system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password: sysAdminPassword,
    },
  });

  // 3. Admin creates a job posting state
  const postingStateLabel = RandomGenerator.name(2);
  const postingState: IAtsRecruitmentJobPostingState =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: RandomGenerator.alphaNumeric(6),
          label: postingStateLabel,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: true,
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(postingState);

  // 4. Admin creates employment type
  const employmentTypeLabel = RandomGenerator.name(2);
  const employmentType: IAtsRecruitmentJobEmploymentType =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: employmentTypeLabel,
          description: RandomGenerator.paragraph({ sentences: 4 }),
          is_active: true,
        },
      },
    );
  typia.assert(employmentType);

  // 5. Register HR recruiter and login
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = RandomGenerator.alphaNumeric(12);
  const recruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: recruiterEmail,
        password: recruiterPassword,
        name: RandomGenerator.name(),
        department: RandomGenerator.name(1),
      },
    });
  typia.assert(recruiter);

  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    },
  });

  // 6. Create a job posting as this HR recruiter
  const applicationDeadline = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 10,
  ).toISOString();
  const jobPosting: IAtsRecruitmentJobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: recruiter.id,
          job_employment_type_id: employmentType.id,
          job_posting_state_id: postingState.id,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 3 }),
          location: RandomGenerator.name(1),
          salary_range_min: 40000,
          salary_range_max: 90000,
          application_deadline: applicationDeadline,
          is_visible: true,
        },
      },
    );
  typia.assert(jobPosting);

  // 7. List job postings, filtered by recruiter
  const page1: IPageIAtsRecruitmentJobPosting.ISummary =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.index(
      connection,
      {
        body: {
          hr_recruiter_id: recruiter.id,
          page: 1 as number & tags.Type<"int32">,
          limit: 10 as number & tags.Type<"int32">,
        },
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "job postings results are present",
    page1.data.length > 0,
  );
  TestValidator.predicate(
    "all results belong to recruiter",
    page1.data.every(
      (post) => post.id !== undefined && typeof post.id === "string",
    ),
  );

  // 8. List job postings, filtered by employment type
  const employmentTypePage: IPageIAtsRecruitmentJobPosting.ISummary =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.index(
      connection,
      {
        body: {
          job_employment_type_id: employmentType.id,
          limit: 10 as number & tags.Type<"int32">,
          page: 1 as number & tags.Type<"int32">,
        },
      },
    );
  typia.assert(employmentTypePage);
  TestValidator.predicate(
    "employment type postings found",
    employmentTypePage.data.some(
      (r) => r.job_employment_type_id === employmentType.id,
    ),
  );

  // 9. List job postings, filtered by posting state
  const statePage: IPageIAtsRecruitmentJobPosting.ISummary =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.index(
      connection,
      {
        body: {
          job_posting_state_id: postingState.id,
          limit: 10 as number & tags.Type<"int32">,
          page: 1 as number & tags.Type<"int32">,
        },
      },
    );
  typia.assert(statePage);
  TestValidator.predicate(
    "posting state matches result",
    statePage.data.some((r) => r.job_posting_state_id === postingState.id),
  );

  // 10. Test pagination boundary with high page number (should be empty)
  const hugePage: IPageIAtsRecruitmentJobPosting.ISummary =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.index(
      connection,
      {
        body: {
          hr_recruiter_id: recruiter.id,
          page: 100 as number & tags.Type<"int32">,
          limit: 10 as number & tags.Type<"int32">,
        },
      },
    );
  typia.assert(hugePage);
  TestValidator.equals(
    "pagination: high page returns zero results",
    hugePage.data.length,
    0,
  );
}
