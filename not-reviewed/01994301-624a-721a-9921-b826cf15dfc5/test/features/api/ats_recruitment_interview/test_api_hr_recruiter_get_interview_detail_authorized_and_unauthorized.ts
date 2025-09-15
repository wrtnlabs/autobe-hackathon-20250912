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
 * End-to-end test for retrieving interview details as an HR recruiter
 * (authorized/unauthorized).
 *
 * 1. Register HR recruiter (obtain credentials)
 * 2. Register applicant
 * 3. Register tech reviewer
 * 4. Create interview with recruiter as participant (authorized access case)
 * 5. Create another interview not involving recruiter (unauthorized test)
 * 6. Fetch authorized interview as recruiter, check all critical fields
 * 7. Attempt fetch of unauthorized interview as recruiter (expect error)
 * 8. Attempt fetch with unknown (but valid) uuid (expect error)
 */
export async function test_api_hr_recruiter_get_interview_detail_authorized_and_unauthorized(
  connection: api.IConnection,
) {
  // 1. Register HR recruiter
  const recruiterJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    department: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  const recruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: recruiterJoin,
    });
  typia.assert(recruiter);

  // 2. Register applicant
  const applicantJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IAtsRecruitmentApplicant.ICreate;
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: applicantJoin,
    });
  typia.assert(applicant);

  // 3. Register tech reviewer
  const reviewerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    specialization: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IAtsRecruitmentTechReviewer.ICreate;
  const reviewer: IAtsRecruitmentTechReviewer.IAuthorized =
    await api.functional.auth.techReviewer.join(connection, {
      body: reviewerJoin,
    });
  typia.assert(reviewer);

  // Create two fake application IDs for interview linkage
  const applicationId1 = typia.random<string & tags.Format<"uuid">>();
  const applicationId2 = typia.random<string & tags.Format<"uuid">>();

  // 4. Create interview with recruiter as participant (authorized)
  const interviewAuthorized =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: applicationId1,
          title: RandomGenerator.name(3),
          stage: "first_phase",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interviewAuthorized);

  // 5. Create interview not involving recruiter (unauthorized test)
  // To simulate a different interview, re-register as a new recruiter
  const nonParticipantHrJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    department: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  await api.functional.auth.hrRecruiter.join(connection, {
    body: nonParticipantHrJoin,
  });

  const interviewUnauthorized =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: applicationId2,
          title: RandomGenerator.name(3),
          stage: "tech_round",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interviewUnauthorized);

  // Switch back to original recruiter (authorized)
  await api.functional.auth.hrRecruiter.join(connection, {
    body: recruiterJoin,
  });

  // 6. Fetch authorized interview as recruiter
  const fetched = await api.functional.atsRecruitment.hrRecruiter.interviews.at(
    connection,
    {
      interviewId: interviewAuthorized.id,
    },
  );
  typia.assert(fetched);
  TestValidator.equals(
    "fetched interview id matches",
    fetched.id,
    interviewAuthorized.id,
  );
  TestValidator.equals(
    "stage matches",
    fetched.stage,
    interviewAuthorized.stage,
  );
  TestValidator.equals(
    "status matches",
    fetched.status,
    interviewAuthorized.status,
  );
  TestValidator.equals(
    "parent application linkage",
    fetched.ats_recruitment_application_id,
    applicationId1,
  );
  TestValidator.predicate(
    "fetched interview has created_at timestamp",
    typeof fetched.created_at === "string" && Boolean(fetched.created_at),
  );
  TestValidator.predicate(
    "fetched interview has updated_at timestamp",
    typeof fetched.updated_at === "string" && Boolean(fetched.updated_at),
  );
  // There may or may not be notes or deleted_at

  // 7. Attempt fetch of unauthorized interview as recruiter
  await TestValidator.error(
    "fetching interview with wrong recruiter should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.at(
        connection,
        {
          interviewId: interviewUnauthorized.id,
        },
      );
    },
  );

  // 8. Attempt fetch with an unknown (but valid format) uuid should error
  await TestValidator.error(
    "fetch interview with non-existent valid uuid should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.at(
        connection,
        {
          interviewId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
