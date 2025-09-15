import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for HR recruiter access control on interview participant detail API.
 * Validates authorized and unauthorized access cases for interview participant
 * details.
 *
 * 1. Register HR recruiter and applicant
 * 2. HR recruiter creates a job posting
 * 3. Applicant applies for the job
 * 4. HR creates an interview linked to the application
 * 5. HR recruiter and applicant are both invited as participants
 * 6. HR retrieves their own participant detail and applicant's detail successfully
 * 7. Attempts to retrieve unrelated participant or wrong interviewId yield error
 * 8. Unauthenticated and wrong-role access are properly forbidden
 */
export async function test_api_hr_interviewer_participant_detail_access_control(
  connection: api.IConnection,
) {
  // 1. Register HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hr = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hr);

  // 2. Register Applicant
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

  // 3. Login as HR recruiter (in case join does not persist session)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 4. HR recruiter creates a job posting
  const jobPost =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hr.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          location: RandomGenerator.paragraph({ sentences: 1 }),
          salary_range_min: 3000,
          salary_range_max: 6000,
          application_deadline: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 10,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPost);

  // 5. Logout HR, Login as Applicant to submit application
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 6. Applicant applies to the job posting
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPost.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 7. Login as HR again to create interview
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 8. HR creates an interview for the application
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          stage: "first_phase",
          status: "scheduled",
          notes: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview);

  // 9. HR adds themselves as a participant (role: recruiter)
  const hrParticipant =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_hrrecruiter_id: hr.id,
          role: "recruiter",
          confirmation_status: "accepted",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(hrParticipant);

  // 10. HR also adds applicant as participant
  const applicantParticipant =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_applicant_id: applicant.id,
          role: "applicant",
          confirmation_status: "pending",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(applicantParticipant);

  // 11. HR recruiter gets participant details for themselves
  const fetchedHrParticipant =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.at(
      connection,
      {
        interviewId: interview.id,
        participantId: hrParticipant.id,
      },
    );
  typia.assert(fetchedHrParticipant);
  TestValidator.equals(
    "HR recruiter sees own participant record",
    fetchedHrParticipant,
    hrParticipant,
  );

  // 12. HR recruiter gets participant details of applicant
  const fetchedApplicantParticipant =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.at(
      connection,
      {
        interviewId: interview.id,
        participantId: applicantParticipant.id,
      },
    );
  typia.assert(fetchedApplicantParticipant);
  TestValidator.equals(
    "HR recruiter sees applicant participant record",
    fetchedApplicantParticipant,
    applicantParticipant,
  );

  // 13. Try getting unrelated participantId (random)
  await TestValidator.error(
    "Accessing unrelated participantId returns error",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.participants.at(
        connection,
        {
          interviewId: interview.id,
          participantId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 14. Try getting correct participantId but from unrelated interviewId (random)
  await TestValidator.error(
    "Accessing participant via wrong interviewId returns error",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.participants.at(
        connection,
        {
          interviewId: typia.random<string & tags.Format<"uuid">>(),
          participantId: applicantParticipant.id,
        },
      );
    },
  );

  // 15. Try unauthenticated access (simulate logout)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("Unauthenticated request forbidden", async () => {
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.at(
      unauthConn,
      {
        interviewId: interview.id,
        participantId: applicantParticipant.id,
      },
    );
  });

  // 16. Applicant login tries to access HR-only endpoint (should get forbidden)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "Applicant cannot access HR recruiter participant endpoint",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.participants.at(
        connection,
        {
          interviewId: interview.id,
          participantId: applicantParticipant.id,
        },
      );
    },
  );
}
