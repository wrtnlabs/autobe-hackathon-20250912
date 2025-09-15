import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test the ability of a technical reviewer to retrieve the detailed information
 * of a specific interview (by interviewId) they are assigned to. Includes:
 *
 * - Successful access when the tech reviewer is a participant
 * - Error (401) when not authenticated
 * - Error (403) when interview is NOT for this reviewer
 * - Error (404) when using a non-existent interviewId
 */
export async function test_api_tech_reviewer_interview_detail_access(
  connection: api.IConnection,
) {
  // 1. Create tech reviewer
  const techReviewerEmail = typia.random<string & tags.Format<"email">>();
  const techReviewerPassword = RandomGenerator.alphaNumeric(12);
  const techReviewer: IAtsRecruitmentTechReviewer.IAuthorized =
    await api.functional.auth.techReviewer.join(connection, {
      body: {
        email: techReviewerEmail,
        password: techReviewerPassword,
        name: RandomGenerator.name(),
        specialization:
          RandomGenerator.pick(["Backend", "Frontend", "Data", null]) ??
          undefined,
      } satisfies IAtsRecruitmentTechReviewer.ICreate,
    });
  typia.assert(techReviewer);

  // 2. Applicant account (for application linkage in interview)
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: null,
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
  typia.assert(applicant);

  // 3. HR recruiter account (needed for interview creation rights)
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(15);
  const hrRecruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrEmail,
        password: hrPassword,
        name: RandomGenerator.name(),
        department:
          RandomGenerator.pick(["People", "Recruitment", null]) ?? undefined,
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hrRecruiter);

  // 4. HR login (ensure HR context for interview creation)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 5. Create interview -- with applicant's application id as application link
  const interviewCreate = {
    ats_recruitment_application_id: applicant.id as string &
      tags.Format<"uuid">,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    stage: RandomGenerator.pick(["tech_round", "final", "screening"]),
    status: RandomGenerator.pick(["scheduled", "completed", "failed"]),
    notes: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IAtsRecruitmentInterview.ICreate;
  const interview: IAtsRecruitmentInterview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: interviewCreate,
      },
    );
  typia.assert(interview);

  // 6. Log in as tech reviewer
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: techReviewerEmail,
      password: techReviewerPassword,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });

  // 7. GET interview as tech reviewer (should succeed)
  const interviewDetail =
    await api.functional.atsRecruitment.techReviewer.interviews.at(connection, {
      interviewId: interview.id,
    });
  typia.assert(interviewDetail);
  TestValidator.equals(
    "interview detail response matches interview created",
    interviewDetail,
    interview,
  );

  // 8. GET interview as unauthenticated actor (should 401)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "tech reviewer interview detail - 401 unauthenticated",
    async () => {
      await api.functional.atsRecruitment.techReviewer.interviews.at(
        unauthConn,
        {
          interviewId: interview.id,
        },
      );
    },
  );

  // 9. GET interview as another tech reviewer (should 403)
  const otherTechReviewerEmail = typia.random<string & tags.Format<"email">>();
  const otherTechReviewerPassword = RandomGenerator.alphaNumeric(10);
  const otherTechReviewer: IAtsRecruitmentTechReviewer.IAuthorized =
    await api.functional.auth.techReviewer.join(connection, {
      body: {
        email: otherTechReviewerEmail,
        password: otherTechReviewerPassword,
        name: RandomGenerator.name(),
        specialization: null,
      } satisfies IAtsRecruitmentTechReviewer.ICreate,
    });
  typia.assert(otherTechReviewer);
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: otherTechReviewerEmail,
      password: otherTechReviewerPassword,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });
  await TestValidator.error(
    "interview detail access forbidden for unrelated reviewer",
    async () => {
      await api.functional.atsRecruitment.techReviewer.interviews.at(
        connection,
        {
          interviewId: interview.id,
        },
      );
    },
  );

  // 10. GET non-existent interview (should 404)
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: techReviewerEmail,
      password: techReviewerPassword,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });
  const nonExistentInterviewId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "nonexistent interviewId - should 404",
    async () => {
      await api.functional.atsRecruitment.techReviewer.interviews.at(
        connection,
        {
          interviewId: nonExistentInterviewId,
        },
      );
    },
  );
}
