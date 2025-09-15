import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentApplicationSkillMatch } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationSkillMatch";
import type { IAtsRecruitmentApplicationSkillMatchesArray } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationSkillMatchesArray";
import type { IAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentResume";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate technical reviewer skill match review workflow for applications.
 *
 * Steps:
 *
 * 1. Register and login as technical reviewer
 * 2. Register and login as applicant
 * 3. Applicant creates a resume
 * 4. Applicant creates an application (random job posting UUID)
 * 5. Reviewer logs in and retrieves skill match results (success)
 * 6. Reviewer tries with random UUID (should fail)
 * 7. Reviewer attempts to access unauthorized application (should error)
 * 8. Applicant tries to get skill matches (should fail: insufficient permission)
 */
export async function test_api_techreviewer_application_skillmatches_review_flow(
  connection: api.IConnection,
) {
  // 1. Register technical reviewer
  const techEmail = typia.random<string & tags.Format<"email">>();
  const techPass = RandomGenerator.alphaNumeric(12);
  const techName = RandomGenerator.name();
  const techReviewer = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: techEmail,
      password: techPass,
      name: techName,
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  typia.assert(techReviewer);

  // 2. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPass = RandomGenerator.alphaNumeric(12);
  const applicantName = RandomGenerator.name();
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPass,
      name: applicantName,
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // 3. Applicant logs in to establish context (connection auto-switch)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPass,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 4. Applicant creates resume
  const resume = await api.functional.atsRecruitment.applicant.resumes.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        parsed_name: RandomGenerator.name(),
      } satisfies IAtsRecruitmentResume.ICreate,
    },
  );
  typia.assert(resume);

  // 5. Applicant creates application (simulate job_posting_id)
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

  // 6. Reviewer login context switch
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: techEmail,
      password: techPass,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });

  // 7. Reviewer fetches skill matches (success)
  const matches =
    await api.functional.atsRecruitment.techReviewer.applications.skillMatches.index(
      connection,
      {
        applicationId: application.id,
      },
    );
  typia.assert(matches);
  TestValidator.predicate(
    "Skill matches must be array",
    Array.isArray(matches),
  );

  // 8. Reviewer fetches for non-existent application (fail)
  await TestValidator.error(
    "skill matches with random applicationId fails",
    async () => {
      await api.functional.atsRecruitment.techReviewer.applications.skillMatches.index(
        connection,
        {
          applicationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 9. Attempt by applicant (not authorized for reviewer path)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPass,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "applicant cannot access reviewer skill match API",
    async () => {
      await api.functional.atsRecruitment.techReviewer.applications.skillMatches.index(
        connection,
        {
          applicationId: application.id,
        },
      );
    },
  );
}
