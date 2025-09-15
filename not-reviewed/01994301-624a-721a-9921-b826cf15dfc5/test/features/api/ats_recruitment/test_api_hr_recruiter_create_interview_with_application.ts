import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * End-to-end test for HR recruiter interview creation in ATS
 *
 * Steps:
 *
 * 1. Register and login HR recruiter (save credentials for later login
 *    swapping)
 * 2. Register applicant (save credentials for later)
 * 3. Register technical reviewer (used only for positive case context)
 * 4. HR recruiter creates job posting (with random business fields)
 * 5. Log in as applicant, apply to the created job posting
 * 6. Log back in as HR recruiter
 * 7. HR recruiter creates an interview, referencing correct applicationId;
 *    include valid title, stage, status, and notes
 * 8. Validate returned interview fields: correct linkage
 *    (ats_recruitment_application_id), title, stage, status, notes field;
 *    verify created_at/updated_at/deleted_at shape (deleted_at null).
 *
 * Negative tests: (a) Attempt interview creation as applicant (should get
 * 401 Unauthorized) (b) Attempt creation with missing required fields
 * (should get 400) (c) Attempt creation with invalid applicationId (random
 * UUID) (should get 404) (d) Register and login as another HR recruiter,
 * create posting and application, then log in as initial recruiter and try
 * to reference other recruiter's application for interview (should get
 * 403)
 */
export async function test_api_hr_recruiter_create_interview_with_application(
  connection: api.IConnection,
) {
  // 1. HR recruiter registration and login
  const hrRecruiterEmail = typia.random<string & tags.Format<"email">>();
  const hrRecruiterPassword = RandomGenerator.alphaNumeric(12);
  const hrRecruiterJoin = await api.functional.auth.hrRecruiter.join(
    connection,
    {
      body: {
        email: hrRecruiterEmail,
        password: hrRecruiterPassword,
        name: RandomGenerator.name(),
        department: RandomGenerator.name(1),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    },
  );
  typia.assert(hrRecruiterJoin);

  // 2. Applicant registration
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicantJoin = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicantJoin);

  // 3. Technical Reviewer registration
  const techReviewerJoin = await api.functional.auth.techReviewer.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        specialization: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IAtsRecruitmentTechReviewer.ICreate,
    },
  );
  typia.assert(techReviewerJoin);

  // 4. HR recruiter creates a job posting
  const jobPostingInput = {
    hr_recruiter_id: hrRecruiterJoin.id,
    job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
    job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    salary_range_min: 50000,
    salary_range_max: 100000,
    application_deadline: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    is_visible: true,
  } satisfies IAtsRecruitmentJobPosting.ICreate;
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      { body: jobPostingInput },
    );
  typia.assert(jobPosting);
  TestValidator.equals(
    "HR recruiter matches in job posting",
    jobPosting.hr_recruiter_id,
    hrRecruiterJoin.id,
  );

  // 5. Login as applicant (overwrite session)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 6. Applicant creates an application for the posting
  const applicationBody = {
    job_posting_id: jobPosting.id,
  } satisfies IAtsRecruitmentApplication.ICreate;
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      { body: applicationBody },
    );
  typia.assert(application);
  TestValidator.equals(
    "application job posting matches",
    application.job_posting_id,
    jobPosting.id,
  );
  TestValidator.equals(
    "application applicant ID matches",
    application.applicant_id,
    applicantJoin.id,
  );

  // 7. Log back as HR recruiter
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrRecruiterEmail,
      password: hrRecruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 8. HR creates new interview referencing application
  const interviewInput = {
    ats_recruitment_application_id: application.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    stage: RandomGenerator.pick([
      "first_phase",
      "tech_round",
      "hr",
      "final",
    ] as const),
    status: RandomGenerator.pick([
      "scheduled",
      "pending",
      "completed",
    ] as const),
    notes: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IAtsRecruitmentInterview.ICreate;
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: interviewInput,
      },
    );
  typia.assert(interview);
  TestValidator.equals(
    "interview references correct application",
    interview.ats_recruitment_application_id,
    application.id,
  );
  TestValidator.equals(
    "interview title matches input",
    interview.title,
    interviewInput.title,
  );
  TestValidator.equals(
    "interview stage",
    interview.stage,
    interviewInput.stage,
  );
  TestValidator.equals(
    "interview status",
    interview.status,
    interviewInput.status,
  );
  TestValidator.equals(
    "interview notes",
    interview.notes,
    interviewInput.notes,
  );
  TestValidator.predicate(
    "created_at is valid",
    typeof interview.created_at === "string" && interview.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    typeof interview.updated_at === "string" && interview.updated_at.length > 0,
  );
  TestValidator.equals(
    "interview deleted_at is null/undefined",
    interview.deleted_at ?? null,
    null,
  );

  // 9a. Negative: Attempt interview creation as applicant (should fail 401)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error("applicant cannot create interview", async () => {
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          stage: RandomGenerator.pick(["first_phase", "tech_round"] as const),
          status: RandomGenerator.pick(["scheduled", "completed"] as const),
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  });

  // 9b. Negative: Omit required field (title) (should fail 400)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrRecruiterEmail,
      password: hrRecruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  await TestValidator.error("missing required field in interview", async () => {
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          // ats_recruitment_application_id present
          ats_recruitment_application_id: application.id,
          // Omit title
          stage: RandomGenerator.pick(["first_phase", "hr"] as const),
          status: RandomGenerator.pick(["pending", "scheduled"] as const),
        } satisfies Partial<IAtsRecruitmentInterview.ICreate> as IAtsRecruitmentInterview.ICreate,
      },
    );
  });

  // 9c. Negative: Reference invalid applicationId (random UUID) (should fail 404)
  await TestValidator.error(
    "nonexistent applicationId should not create interview",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.create(
        connection,
        {
          body: {
            ats_recruitment_application_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            title: RandomGenerator.paragraph({ sentences: 2 }),
            stage: RandomGenerator.pick(["first_phase", "final"] as const),
            status: RandomGenerator.pick(["completed", "pending"] as const),
          } satisfies IAtsRecruitmentInterview.ICreate,
        },
      );
    },
  );

  // 9d. Negative: Reference another HR’s application
  // Register/login as another recruiter
  const otherHrEmail = typia.random<string & tags.Format<"email">>();
  const otherHrPassword = RandomGenerator.alphaNumeric(12);
  const otherHr = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: otherHrEmail,
      password: otherHrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(otherHr);
  // Other recruiter creates a posting
  const otherPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: otherHr.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(otherPosting);
  // Login as applicant; apply to job
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const otherApplication =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: otherPosting.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(otherApplication);
  // Login as original HR recruiter
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrRecruiterEmail,
      password: hrRecruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  await TestValidator.error(
    "cannot create interview for application owned by other recruiter",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.create(
        connection,
        {
          body: {
            ats_recruitment_application_id: otherApplication.id,
            title: RandomGenerator.paragraph({ sentences: 2 }),
            stage: RandomGenerator.pick(["tech_round", "final"] as const),
            status: RandomGenerator.pick(["scheduled", "pending"] as const),
          } satisfies IAtsRecruitmentInterview.ICreate,
        },
      );
    },
  );
}
