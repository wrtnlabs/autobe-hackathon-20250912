import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * System administrator removes a participant from an interview session.
 *
 * Steps:
 *
 * 1. Register and authenticate a system admin (with super_admin=true)
 * 2. Register an applicant (candidate), HR recruiter, and tech reviewer
 * 3. System admin creates an interview (use applicant ID as related application
 *    ID)
 * 4. System admin adds three participants: the applicant (role="applicant"), the
 *    HR recruiter (role="recruiter"), and the tech reviewer (role="reviewer")
 * 5. System admin removes the tech reviewer from the interview
 * 6. Attempt removing a non-existent participant (should error)
 * 7. Attempt removal as applicant (should fail due to permission)
 */
export async function test_api_interview_participant_removal_by_admin(
  connection: api.IConnection,
) {
  // 1. System admin join and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        super_admin: true,
      },
    });
  typia.assert(admin);

  // 2. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(10);
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        name: RandomGenerator.name(),
      },
    });
  typia.assert(applicant);

  // 3. Register HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(10);
  const hrRecruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrEmail,
        password: hrPassword,
        name: RandomGenerator.name(),
      },
    });
  typia.assert(hrRecruiter);

  // 4. Register tech reviewer
  const techEmail = typia.random<string & tags.Format<"email">>();
  const techPassword = RandomGenerator.alphaNumeric(10);
  const techReviewer: IAtsRecruitmentTechReviewer.IAuthorized =
    await api.functional.auth.techReviewer.join(connection, {
      body: {
        email: techEmail,
        password: techPassword,
        name: RandomGenerator.name(),
      },
    });
  typia.assert(techReviewer);

  // 5. System admin creates an interview (mock application ID with applicant.id)
  const interview: IAtsRecruitmentInterview =
    await api.functional.atsRecruitment.systemAdmin.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id:
            applicant.id satisfies string as string,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          stage: "tech_round",
          status: "scheduled",
        },
      },
    );
  typia.assert(interview);

  // 6. Admin adds applicant participant
  const applicantParticipant: IAtsRecruitmentInterviewParticipant =
    await api.functional.atsRecruitment.systemAdmin.interviews.participants.create(
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

  // 7. Admin adds HR recruiter participant
  const hrParticipant: IAtsRecruitmentInterviewParticipant =
    await api.functional.atsRecruitment.systemAdmin.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_hrrecruiter_id: hrRecruiter.id,
          role: "recruiter",
          confirmation_status: "pending",
        },
      },
    );
  typia.assert(hrParticipant);

  // 8. Admin adds tech reviewer participant
  const techParticipant: IAtsRecruitmentInterviewParticipant =
    await api.functional.atsRecruitment.systemAdmin.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_techreviewer_id: techReviewer.id,
          role: "reviewer",
          confirmation_status: "pending",
        },
      },
    );
  typia.assert(techParticipant);

  // 9. Admin removes the tech reviewer participant
  await api.functional.atsRecruitment.systemAdmin.interviews.participants.erase(
    connection,
    {
      interviewId: interview.id,
      participantId: techParticipant.id,
    },
  );

  // 10. Attempt removal of non-existent participant (should error)
  await TestValidator.error(
    "remove non-existent participant must error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.participants.erase(
        connection,
        {
          interviewId: interview.id,
          participantId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 11. Attempt participant removal as applicant (should error)
  // Use a connection representing the applicant. (simulate unauth connection)
  const applicantConnection: api.IConnection = { ...connection, headers: {} };
  // Applicant login to get their own token
  await api.functional.auth.applicant.join(applicantConnection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
    },
  });
  await TestValidator.error("applicant cannot remove participant", async () => {
    await api.functional.atsRecruitment.systemAdmin.interviews.participants.erase(
      applicantConnection,
      {
        interviewId: interview.id,
        participantId: hrParticipant.id,
      },
    );
  });
}
