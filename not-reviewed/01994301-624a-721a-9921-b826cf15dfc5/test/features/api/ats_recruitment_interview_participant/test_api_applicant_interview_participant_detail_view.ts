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
 * E2E: Applicant can fetch their participant detail for their interview. Test
 * flow:
 *
 * 1. Register applicant (unique email/password).
 * 2. Register HR recruiter (unique email/password).
 * 3. Applicant logs in (for context-switch).
 * 4. HR logs in, creates job posting (with required random data).
 * 5. Applicant logs in, applies to job posting.
 * 6. HR logs in, creates interview for application.
 * 7. HR adds applicant as participant to interview.
 * 8. Applicant reads own participant entry (success case).
 * 9. Errors: unrelated participantId/interviewId, or as unauthenticated user
 *    (forbidden).
 *
 * Core validations:
 *
 * - All response fields exactly match created participant state.
 * - Only real participant can fetch their participant info.
 * - Error on unrelated IDs or missing context.
 */
export async function test_api_applicant_interview_participant_detail_view(
  connection: api.IConnection,
) {
  // 1. Register (join) applicant
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
  // 2. Register (join) HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hr = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hr);
  // 3. HR login
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  // 4. HR creates job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hr.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          location: RandomGenerator.paragraph({ sentences: 2 }),
          salary_range_min: 1200000,
          salary_range_max: 1500000,
          application_deadline: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 21,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);
  // 5. Applicant logs in
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  // 6. Applicant applies to job posting
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);
  // 7. HR login again
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  // 8. HR creates interview
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          stage: "first_phase",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview);
  // 9. HR adds applicant as participant
  const participant =
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
  typia.assert(participant);
  // 10. Switch back to applicant and fetch participant detail
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const detail =
    await api.functional.atsRecruitment.applicant.interviews.participants.at(
      connection,
      {
        interviewId: interview.id,
        participantId: participant.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "fetched participant matches created",
    detail,
    participant,
  );
  // Error scenario: unrelated participantId
  await TestValidator.error("error on unrelated participantId", async () => {
    await api.functional.atsRecruitment.applicant.interviews.participants.at(
      connection,
      {
        interviewId: interview.id,
        participantId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Error scenario: unrelated interviewId
  await TestValidator.error("error on unrelated interviewId", async () => {
    await api.functional.atsRecruitment.applicant.interviews.participants.at(
      connection,
      {
        interviewId: typia.random<string & tags.Format<"uuid">>(),
        participantId: participant.id,
      },
    );
  });
  // Error: unauthenticated user
  const unauth: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("error on unauthenticated access", async () => {
    await api.functional.atsRecruitment.applicant.interviews.participants.at(
      unauth,
      {
        interviewId: interview.id,
        participantId: participant.id,
      },
    );
  });
}
