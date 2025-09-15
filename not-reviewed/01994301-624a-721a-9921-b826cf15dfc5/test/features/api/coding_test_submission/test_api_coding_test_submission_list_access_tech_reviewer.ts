import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestSubmission";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentCodingTestSubmission";

/**
 * Validates tech reviewer access to coding test submissions (with pagination,
 * filter, authentication & scope).
 *
 * Steps:
 *
 * 1. HR recruiter signup and login
 * 2. Applicant signup and login
 * 3. Tech reviewer signup and login
 * 4. HR recruiter creates a coding test for the applicant
 * 5. Applicant makes at least one submission to the coding test
 * 6. Tech reviewer fetches the submission listing by codingTestId with PATCH,
 *    tests advanced filters & pagination
 * 7. Verify results: matches expected structure & scope
 * 8. Negative tests:
 *
 *    - Unauthenticated access
 *    - Reviewer out of scope
 *    - Non-existent codingTestId
 */
export async function test_api_coding_test_submission_list_access_tech_reviewer(
  connection: api.IConnection,
) {
  // 1. HR Recruiter: create and login
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(10);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 2. Applicant: create and login
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(10);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 3. Tech Reviewer: create and login
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerPassword = RandomGenerator.alphaNumeric(10);
  const techReviewer = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
      name: RandomGenerator.name(),
      specialization: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  typia.assert(techReviewer);
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });

  // 4. HR recruiter creates coding test
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  // Simulate application UUID (prerequisite for test assignment)
  const applicationId = typia.random<string & tags.Format<"uuid">>();
  const codingTestBody = {
    ats_recruitment_application_id: applicationId,
    ats_recruitment_applicant_id: applicant.id,
    ats_recruitment_hrrecruiter_id: hrRecruiter.id,
    test_provider: "internal",
    test_external_id: null,
    test_url: null,
    scheduled_at: new Date().toISOString(),
    delivered_at: null,
    status: "scheduled",
    expiration_at: null,
    callback_received_at: null,
    closed_at: null,
  } satisfies IAtsRecruitmentCodingTest.ICreate;
  const codingTest =
    await api.functional.atsRecruitment.hrRecruiter.codingTests.create(
      connection,
      { body: codingTestBody },
    );
  typia.assert(codingTest);

  // 5. Applicant submits to coding test
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const submissionBody = {
    ats_recruitment_coding_test_id: codingTest.id,
    ats_recruitment_application_id: applicationId,
    submitted_at: new Date().toISOString(),
    answer_file_url: RandomGenerator.alphaNumeric(20),
    answer_text: RandomGenerator.paragraph({ sentences: 5 }),
    status: "pending",
    received_external_at: null,
    review_status: "pending",
    reviewed_at: null,
    review_comment_summary: null,
  } satisfies IAtsRecruitmentCodingTestSubmission.ICreate;
  const submission =
    await api.functional.atsRecruitment.applicant.codingTests.submissions.create(
      connection,
      {
        codingTestId: codingTest.id,
        body: submissionBody,
      },
    );
  typia.assert(submission);

  // 6. Tech reviewer requests: all/filtered/paginated
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });
  // No filter
  const submissionsListing =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.index(
      connection,
      {
        codingTestId: codingTest.id,
        body: {} satisfies IAtsRecruitmentCodingTestSubmission.IRequest,
      },
    );
  typia.assert(submissionsListing);
  TestValidator.predicate(
    "returned at least one submission",
    submissionsListing.data.length >= 1,
  );

  // Filtered by status
  const statusFiltered =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.index(
      connection,
      {
        codingTestId: codingTest.id,
        body: {
          status: submission.status,
        } satisfies IAtsRecruitmentCodingTestSubmission.IRequest,
      },
    );
  typia.assert(statusFiltered);
  TestValidator.predicate(
    "filtered by status returns correct submission",
    statusFiltered.data.some((s) => s.id === submission.id),
  );

  // Paginated
  const paged =
    await api.functional.atsRecruitment.techReviewer.codingTests.submissions.index(
      connection,
      {
        codingTestId: codingTest.id,
        body: {
          limit: 1,
          page: 1,
        } satisfies IAtsRecruitmentCodingTestSubmission.IRequest,
      },
    );
  typia.assert(paged);
  TestValidator.equals("pagination - limit", paged.pagination.limit, 1);
  TestValidator.equals(
    "pagination - current page",
    paged.pagination.current,
    1,
  );

  // 7. Negative: non-existent codingTestId
  await TestValidator.error(
    "non-existent codingTestId returns error",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.index(
        connection,
        {
          codingTestId: typia.random<string & tags.Format<"uuid">>(),
          body: {} satisfies IAtsRecruitmentCodingTestSubmission.IRequest,
        },
      );
    },
  );

  // Unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated reviewer can't view submissions",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.index(
        unauthConn,
        {
          codingTestId: codingTest.id,
          body: {} satisfies IAtsRecruitmentCodingTestSubmission.IRequest,
        },
      );
    },
  );

  // Reviewer out of scope
  const reviewer2Email = typia.random<string & tags.Format<"email">>();
  const reviewer2Password = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: reviewer2Email,
      password: reviewer2Password,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewer2Email,
      password: reviewer2Password,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });
  await TestValidator.error(
    "out-of-scope reviewer cannot view submissions for unrelated coding test",
    async () => {
      await api.functional.atsRecruitment.techReviewer.codingTests.submissions.index(
        connection,
        {
          codingTestId: codingTest.id,
          body: {} satisfies IAtsRecruitmentCodingTestSubmission.IRequest,
        },
      );
    },
  );
}
