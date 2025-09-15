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

/**
 * Validate System Admin creates job posting on behalf of HR recruiter:
 * Success scenario.
 *
 * 1. Register and authenticate as System Admin (super_admin: true)
 * 2. Register new HR recruiter (to assign as manager of the job posting)
 * 3. Create a job employment type (e.g., "Internship")
 * 4. Create a job posting state (e.g., "draft")
 * 5. System Admin creates job posting referencing the recruiter, employment
 *    type, posting state
 * 6. Validate that all foreign keys in the returned posting match the created
 *    entities
 * 7. Validate job posting fields (title, description, etc.) exactly match
 *    input, and are set as per business logic
 */
export async function test_api_job_posting_creation_full_success_systemadmin_context(
  connection: api.IConnection,
) {
  // 1. Register & authenticate System Admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: "TestPassword123!",
        name: RandomGenerator.name(),
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register HR Recruiter
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: recruiterEmail,
        password: "TestRecruiterPW!2024",
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(recruiter);

  // 3. Create Job Employment Type
  const employmentTypeName = "Internship";
  const jobType: IAtsRecruitmentJobEmploymentType =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: employmentTypeName,
          is_active: true,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(jobType);

  // 4. Create Job Posting State (e.g., 'draft')
  const stateCode = RandomGenerator.alphaNumeric(8);
  const jobState: IAtsRecruitmentJobPostingState =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: stateCode,
          label: "Draft",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
          sort_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(jobState);

  // 5. System Admin creates job posting
  const postingTitle = `${RandomGenerator.paragraph({ sentences: 4 })} - ${RandomGenerator.alphaNumeric(8)}`;
  const postingInput = {
    hr_recruiter_id: recruiter.id,
    job_employment_type_id: jobType.id,
    job_posting_state_id: jobState.id,
    title: postingTitle,
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 8,
    }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    salary_range_min: 3500 + Math.floor(Math.random() * 1500),
    salary_range_max: 5000 + Math.floor(Math.random() * 2000),
    application_deadline: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 30,
    ).toISOString(),
    is_visible: true,
  } satisfies IAtsRecruitmentJobPosting.ICreate;
  const posting: IAtsRecruitmentJobPosting =
    await api.functional.atsRecruitment.systemAdmin.jobPostings.create(
      connection,
      {
        body: postingInput,
      },
    );
  typia.assert(posting);

  // Foreign key validations
  TestValidator.equals(
    "posting.hr_recruiter_id should match recruiter.id",
    posting.hr_recruiter_id,
    recruiter.id,
  );
  TestValidator.equals(
    "posting.job_employment_type_id should match jobType.id",
    posting.job_employment_type_id,
    jobType.id,
  );
  TestValidator.equals(
    "posting.job_posting_state_id should match jobState.id",
    posting.job_posting_state_id,
    jobState.id,
  );
  TestValidator.equals(
    "posting.title should match input",
    posting.title,
    postingInput.title,
  );
  TestValidator.equals(
    "posting.description should match input",
    posting.description,
    postingInput.description,
  );
  TestValidator.equals(
    "posting.location should match input",
    posting.location,
    postingInput.location,
  );
  TestValidator.equals(
    "posting.salary_range_min should match input",
    posting.salary_range_min,
    postingInput.salary_range_min,
  );
  TestValidator.equals(
    "posting.salary_range_max should match input",
    posting.salary_range_max,
    postingInput.salary_range_max,
  );
  TestValidator.equals(
    "posting.application_deadline should match input",
    posting.application_deadline,
    postingInput.application_deadline,
  );
  TestValidator.equals(
    "posting.is_visible should match input",
    posting.is_visible,
    postingInput.is_visible,
  );

  TestValidator.predicate(
    "posting.created_at is ISO8601 and non-empty",
    typeof posting.created_at === "string" && posting.created_at.length > 0,
  );
  TestValidator.predicate(
    "posting.updated_at is ISO8601 and non-empty",
    typeof posting.updated_at === "string" && posting.updated_at.length > 0,
  );
  TestValidator.equals(
    "posting.deleted_at should be undefined or null for active posting",
    posting.deleted_at,
    undefined,
  );
}
