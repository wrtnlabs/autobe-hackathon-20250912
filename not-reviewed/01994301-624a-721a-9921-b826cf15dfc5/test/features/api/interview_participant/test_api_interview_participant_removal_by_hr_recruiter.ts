import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate removal of interview participants by HR recruiter with key business
 * and permission edge cases:
 *
 * 1. HR recruiter A, applicant, and tech reviewer all register.
 * 2. HR recruiter A creates interview.
 * 3. Both applicant and tech reviewer are added to the interview as participants.
 * 4. Tech reviewer successfully removed by HR recruiter A.
 * 5. Attempting to remove already-removed reviewer fails.
 * 6. Attempting to remove final remaining applicant fails (enforces compliance).
 * 7. Unrelated recruiter B cannot remove any participant (permission denied).
 *
 * Listing and status-finalization checks are only described, as no such APIs
 * exist for this test scope.
 */
export async function test_api_interview_participant_removal_by_hr_recruiter(
  connection: api.IConnection,
) {
  // 1. Register HR recruiter A, applicant, and tech reviewer
  const hrA_email = typia.random<string & tags.Format<"email">>();
  const hrA_password = RandomGenerator.alphaNumeric(12);
  const hrA = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrA_email,
      password: hrA_password,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(hrA);

  const applicant_email = typia.random<string & tags.Format<"email">>();
  const applicant_password = RandomGenerator.alphaNumeric(12);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicant_email,
      password: applicant_password,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(applicant);

  const tech_email = typia.random<string & tags.Format<"email">>();
  const tech_password = RandomGenerator.alphaNumeric(12);
  const tech = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: tech_email,
      password: tech_password,
      name: RandomGenerator.name(),
      specialization: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(tech);

  // 2. HR recruiter A creates interview
  const interviewCreate = {
    ats_recruitment_application_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    title: RandomGenerator.paragraph({ sentences: 6 }),
    stage: "first_phase",
    status: "scheduled",
    notes: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IAtsRecruitmentInterview.ICreate;
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: interviewCreate,
      },
    );
  typia.assert(interview);

  // 3. Add applicant as participant
  const applicantParticipant =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_applicant_id: applicant.id,
          role: "applicant",
          confirmation_status: "accepted",
        },
      },
    );
  typia.assert(applicantParticipant);

  // 4. Add tech reviewer as participant
  const techParticipant =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_techreviewer_id: tech.id,
          role: "reviewer",
          confirmation_status: "accepted",
        },
      },
    );
  typia.assert(techParticipant);

  // 5. Remove tech reviewer from interview (success case)
  await api.functional.atsRecruitment.hrRecruiter.interviews.participants.erase(
    connection,
    {
      interviewId: interview.id,
      participantId: techParticipant.id,
    },
  );

  // (simulate participant listing: would validate only applicant remains if supported)

  // 6. Attempt to remove the already removed techParticipant (should fail)
  await TestValidator.error(
    "remove already removed participant should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.participants.erase(
        connection,
        {
          interviewId: interview.id,
          participantId: techParticipant.id,
        },
      );
    },
  );

  // 7. Attempt to remove the final remaining applicant (should fail for compliance)
  await TestValidator.error(
    "cannot remove last required applicant participant",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.participants.erase(
        connection,
        {
          interviewId: interview.id,
          participantId: applicantParticipant.id,
        },
      );
    },
  );

  // 8. Register HR recruiter B and attempt to remove tech reviewer/applicant as unrelated recruiter
  const hrB_email = typia.random<string & tags.Format<"email">>();
  const hrB_password = RandomGenerator.alphaNumeric(12);
  const hrB = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrB_email,
      password: hrB_password,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(hrB);

  // Switch to HR B context and try to remove applicant (should fail due to permission)
  await TestValidator.error(
    "unauthorized recruiter cannot remove participant",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.participants.erase(
        connection,
        {
          interviewId: interview.id,
          participantId: applicantParticipant.id,
        },
      );
    },
  );
}
