import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestSubmission";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentCodingTestSubmission";

/**
 * E2E: HR recruiter views paginated and filtered coding test submissions.
 *
 * 1. Register & login as HR recruiter
 * 2. Register & login as applicant
 * 3. Create coding test assignment as recruiter (link application/applicant/HR)
 * 4. Create at least one submission as applicant
 * 5. Query submissions (PATCH) as recruiter
 * 6. Validation: Assert paged submission(s) are present, filter by review_status
 *    and status, pagination, and error case: unauthenticated, invalid
 *    codingTestId, out-of-bounds page/limit
 */
export async function test_api_coding_test_submission_list_access_hr_recruiter(
  connection: api.IConnection,
) {
  // 1. HR recruiter sign up
  const recruiterEmail: string = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = RandomGenerator.alphaNumeric(12);
  const hrRecruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: recruiterEmail,
        password: recruiterPassword,
        name: RandomGenerator.name(),
        department: RandomGenerator.name(1),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hrRecruiter);

  // Login as recruiter to ensure session
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 2. Applicant sign up
  const applicantEmail: string = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
  typia.assert(applicant);

  // Applicant login
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // Generate fake application id
  const applicationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. HR recruiter creates coding test assignment for applicant
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const scheduledAt = new Date(Date.now() + 3600_000).toISOString();
  const codingTest: IAtsRecruitmentCodingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: applicationId,
          ats_recruitment_applicant_id: applicant.id,
          ats_recruitment_hrrecruiter_id: hrRecruiter.id,
          test_provider: "internal",
          scheduled_at: scheduledAt,
          status: "scheduled",
        } satisfies IAtsRecruitmentCodingTest.ICreate,
      },
    );
  typia.assert(codingTest);

  // 4. Applicant submits code test submission
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const submittedAt = new Date().toISOString();
  const codeSubmission: IAtsRecruitmentCodingTestSubmission =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
      connection,
      {
        codingTestId: codingTest.id,
        body: {
          ats_recruitment_coding_test_id: codingTest.id,
          ats_recruitment_application_id: applicationId,
          submitted_at: submittedAt,
          answer_text: RandomGenerator.paragraph({ sentences: 10 }),
          status: "pending",
          review_status: "pending",
        } satisfies IAtsRecruitmentCodingTestSubmission.ICreate,
      },
    );
  typia.assert(codeSubmission);

  // 5. HR recruiter lists code submissions (PATCH, filtered/paged)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const pageBody = {
    status: "pending",
    review_status: "pending",
    page: 1 as number,
    limit: 10 as number,
  } satisfies IAtsRecruitmentCodingTestSubmission.IRequest;
  const submissionPage: IPageIAtsRecruitmentCodingTestSubmission =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.submissions.index(
      connection,
      {
        codingTestId: codingTest.id,
        body: pageBody,
      },
    );
  typia.assert(submissionPage);

  // 6. Validate paginated result includes candidate submission, correct filters, pagination is sane
  TestValidator.equals(
    "returned page should contain new submission",
    submissionPage.data.find((s) => s.id === codeSubmission.id)?.id,
    codeSubmission.id,
  );
  TestValidator.predicate(
    "pagination metadata should be valid",
    submissionPage.pagination.current === 1 &&
      submissionPage.pagination.limit === 10 &&
      submissionPage.pagination.records >= 1,
  );

  // 7. Error: Unauthenticated access (reset connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated recruiter listing submissions should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.codingTests.submissions.index(
        unauthConn,
        {
          codingTestId: codingTest.id,
          body: pageBody,
        },
      );
    },
  );

  // 8. Error: invalid codingTestId
  await TestValidator.error(
    "listing with non-existent codingTestId should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.codingTests.submissions.index(
        connection,
        {
          codingTestId: typia.random<string & tags.Format<"uuid">>(),
          body: pageBody,
        },
      );
    },
  );

  // 9. Error: out of range page/limit
  await TestValidator.error(
    "listing with huge pagination values should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.codingTests.submissions.index(
        connection,
        {
          codingTestId: codingTest.id,
          body: {
            ...pageBody,
            page: 99999999 as number,
            limit: 1000 as number,
          },
        },
      );
    },
  );
}
