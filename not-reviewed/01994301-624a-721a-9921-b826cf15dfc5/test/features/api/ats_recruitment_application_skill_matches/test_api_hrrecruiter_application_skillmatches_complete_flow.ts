import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentApplicationSkillMatch } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationSkillMatch";
import type { IAtsRecruitmentApplicationSkillMatchesArray } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationSkillMatchesArray";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentResume";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for retrieving job application skill matches as an HR recruiter.
 *
 * This test validates the entire workflow for authorized skill match result
 * retrieval. It executes the following steps:
 *
 * 1. Register a unique HR recruiter account with random email and credentials
 * 2. Login as that HR recruiter to set authentication context
 * 3. Register a unique applicant account
 * 4. Login as the applicant
 * 5. Applicant creates/uploads a resume
 * 6. Applicant submits a new job application referencing both the existing job
 *    posting and applicant resume
 * 7. Switch back to HR recruiter (via login) and retrieve skill match results
 *    using the PATCH HR recruiter API
 * 8. Validate the response structure for
 *    IAtsRecruitmentApplicationSkillMatchesArray, including match_type,
 *    is_manually_verified, etc.
 * 9. Validate successful access for proper HR recruiter, missing/empty array
 *    for applications without skills, forbidden access for unauthorized
 *    roles (applicant), and invalid applicationId error.
 *
 * Edge cases tested:
 *
 * - Application exists but has no skill matches (returns empty array)
 * - Unauthorized retrieval (applicant cannot call HR endpoint)
 * - Invalid applicationId (random UUID not corresponding to a valid record)
 */
export async function test_api_hrrecruiter_application_skillmatches_complete_flow(
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
      department: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  // 2. Ensure HR recruiter login sets auth context
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
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // 4. Login as applicant to set context
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 5. Applicant uploads resume
  const resume = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        parsed_name: RandomGenerator.name(),
        parsed_email: applicantEmail,
        parsed_mobile: RandomGenerator.mobile(),
        parsed_birthdate: null,
        parsed_education_summary: RandomGenerator.paragraph({ sentences: 3 }),
        parsed_experience_summary: RandomGenerator.paragraph({ sentences: 3 }),
        skills_json: JSON.stringify(["TypeScript", "Node.js", "Leadership"]),
      } satisfies IAtsRecruitmentResume.ICreate,
    },
  );
  typia.assert(resume);

  // 6. Applicant creates a job application (simulate preexisting job posting)
  const jobPostingId = typia.random<string & tags.Format<"uuid">>();
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPostingId,
          resume_id: resume.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 7. Switch back to HR recruiter (login for authentication)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 8. HR recruiter retrieves skill matches for the application
  const skillMatches =
    await api.functional.atsRecruitment.hrRecruiter.applications.skillMatches.index(
      connection,
      {
        applicationId: application.id,
      },
    );
  typia.assert(skillMatches);
  TestValidator.predicate("response is array", Array.isArray(skillMatches));
  skillMatches.forEach((entry, idx) => {
    typia.assert<IAtsRecruitmentApplicationSkillMatch>(entry);
    TestValidator.predicate(
      `skill match[${idx}] match_type is non-empty string`,
      typeof entry.match_type === "string" && entry.match_type.length > 0,
    );
    TestValidator.predicate(
      `skill match[${idx}] skill_id is string`,
      typeof entry.skill_id === "string" && entry.skill_id.length > 0,
    );
    TestValidator.predicate(
      `skill match[${idx}] is_manually_verified boolean`,
      typeof entry.is_manually_verified === "boolean",
    );
  });

  // 9. Edge case: Application with no skills (simulate another app on different posting, no skills_json)
  const resumeNoSkills =
    await api.functional.atsRecruitment.applicant.resumes.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        parsed_name: RandomGenerator.name(),
      } satisfies IAtsRecruitmentResume.ICreate,
    });
  typia.assert(resumeNoSkills);
  const appNoSkills =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: typia.random<string & tags.Format<"uuid">>(),
          resume_id: resumeNoSkills.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(appNoSkills);
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const emptySkillMatches =
    await api.functional.atsRecruitment.hrRecruiter.applications.skillMatches.index(
      connection,
      {
        applicationId: appNoSkills.id,
      },
    );
  typia.assert(emptySkillMatches);
  TestValidator.equals(
    "application with no skill matches returns empty list",
    emptySkillMatches.length,
    0,
  );

  // 10. Unauthorized attempt: applicant cannot use HR endpoint
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "applicant cannot fetch HR skill matches",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.skillMatches.index(
        connection,
        {
          applicationId: application.id,
        },
      );
    },
  );

  // 11. Edge case: invalid applicationId (random uuid)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  await TestValidator.error("invalid applicationId returns error", async () => {
    await api.functional.atsRecruitment.hrRecruiter.applications.skillMatches.index(
      connection,
      {
        applicationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
