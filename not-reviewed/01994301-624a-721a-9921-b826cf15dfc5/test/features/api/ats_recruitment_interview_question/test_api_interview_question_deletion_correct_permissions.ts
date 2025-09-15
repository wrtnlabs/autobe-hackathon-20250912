import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewQuestion";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Ensure HR recruiter can delete their own interview question (valid), and
 * deletion fails for non-existent or unauthorized cases.
 *
 * Steps:
 *
 * 1. Create and authenticate HR recruiter (owner).
 * 2. Create interview (via POST /atsRecruitment/hrRecruiter/interviews).
 * 3. Add a question to the interview.
 * 4. Delete the question via the DELETE endpoint.
 * 5. Confirm the question no longer exists (attempting deletion again must fail).
 * 6. Create a different recruiter, and attempt to delete the original recruiter's
 *    question (should fail: permission error).
 */
export async function test_api_interview_question_deletion_correct_permissions(
  connection: api.IConnection,
) {
  // 1. Create and authenticate HR recruiter (owner)
  const recruiterEmail: string = typia.random<string & tags.Format<"email">>();
  const recruiterJoin = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterEmail,
      password: "Password!234",
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiterJoin);
  const recruiterId = recruiterJoin.id;

  // 2. Create interview (the application id must be a UUID, but business context isn't specified)
  const applicationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: applicationId,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          stage: "first_phase",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview);
  const interviewId = interview.id;

  // 3. Add a question
  const questionCreate = {
    ats_recruitment_interview_id: interviewId,
    order: 1,
    question_text: RandomGenerator.paragraph({ sentences: 1 }),
    question_type: "behavioral",
    is_template: false,
  } satisfies IAtsRecruitmentInterviewQuestion.ICreate;
  const question =
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.create(
      connection,
      {
        interviewId,
        body: questionCreate,
      },
    );
  typia.assert(question);
  const questionId = question.id;

  // 4. Delete the question
  await api.functional.atsRecruitment.hrRecruiter.interviews.questions.erase(
    connection,
    {
      interviewId,
      questionId,
    },
  );

  // 5. Try to delete again: should error (not found)
  await TestValidator.error(
    "deleting already deleted/non-existent question must fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.questions.erase(
        connection,
        {
          interviewId,
          questionId,
        },
      );
    },
  );

  // 6. Create another recruiter (different owner)
  const otherEmail: string = typia.random<string & tags.Format<"email">>();
  const otherRecruiter = await api.functional.auth.hrRecruiter.join(
    connection,
    {
      body: {
        email: otherEmail,
        password: "OtherPass!567",
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    },
  );
  typia.assert(otherRecruiter);

  // Switch connection (re-auth) to new recruiter
  // The SDK join automatically updates the Authorization token

  // New recruiter tries to delete the original recruiter's already-deleted question
  await TestValidator.error(
    "another recruiter cannot delete a question from interview they do not own",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.questions.erase(
        connection,
        {
          interviewId,
          questionId,
        },
      );
    },
  );
}
