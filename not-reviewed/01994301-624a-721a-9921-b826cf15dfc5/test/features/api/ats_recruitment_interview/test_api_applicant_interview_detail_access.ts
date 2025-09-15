import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test applicant's detailed interview access, covering:
 *
 * 1. HR recruiter registers, authenticates, schedules interview for applicant
 * 2. Applicant registers, authenticates, reads interview detail (positive)
 * 3. Unauthenticated applicant attempts access (401)
 * 4. Different applicant attempts access (403 Forbidden)
 * 5. Applicant requests with invalid interviewId (404 Not Found)
 */
export async function test_api_applicant_interview_detail_access(
  connection: api.IConnection,
) {
  // Register HR
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.name(1),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  // Login HR recruiter (ensures session, even if join auto-logins)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // Register primary applicant
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

  // Login applicant (store token for positive case)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // HR login again to create interview (resets session to HR)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // HR creates an interview (simulate applicationId reference)
  const applicationId = typia.random<string & tags.Format<"uuid">>();
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: applicationId,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          stage: "first_phase",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview);

  // Positive case: applicant logs in and accesses interview
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const detail = await api.functional.atsRecruitment.applicant.interviews.at(
    connection,
    {
      interviewId: interview.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals(
    "should retrieve correct interview id",
    detail.id,
    interview.id,
  );

  // Negative: unauthenticated access yields 401
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access yields 401", async () => {
    await api.functional.atsRecruitment.applicant.interviews.at(unauthConn, {
      interviewId: interview.id,
    });
  });

  // Forbidden: different applicant joins and tries to access
  const otherApplicantEmail = typia.random<string & tags.Format<"email">>();
  const otherApplicantPassword = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.applicant.join(connection, {
    body: {
      email: otherApplicantEmail,
      password: otherApplicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: otherApplicantEmail,
      password: otherApplicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "different applicant access forbidden (403)",
    async () => {
      await api.functional.atsRecruitment.applicant.interviews.at(connection, {
        interviewId: interview.id,
      });
    },
  );

  // Not found: applicant accesses with random uuid (404)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error("invalid interviewId yields 404", async () => {
    await api.functional.atsRecruitment.applicant.interviews.at(connection, {
      interviewId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
