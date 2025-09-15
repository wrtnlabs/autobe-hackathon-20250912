import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsProctoredExam";

/**
 * This scenario verifies guest user access to the paginated search of
 * proctored exams linked to a specific assessment. It involves guest user
 * registration via the join endpoint to obtain necessary tokens, creation
 * or assumption of prerequisite tenant and assessment contexts, and testing
 * of the proctored exam search for expected results and pagination
 * behavior. The test also validates correct restriction of access to
 * guest-allowed resources and handles failure cases for unauthorized or
 * invalid requests.
 */
export async function test_api_blended_learning_sessions_proctored_exam_paginated_search_guest_access(
  connection: api.IConnection,
) {
  // 1. Register a guest user and authenticate to obtain tokens
  const tenant_id = typia.random<string & tags.Format<"uuid">>();
  const guestEmail = `guest_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const guestPasswordHash = RandomGenerator.alphaNumeric(32);
  const guestFirstName = RandomGenerator.name(1);
  const guestLastName = RandomGenerator.name(1);
  const guestStatus = "active";

  const guest: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        tenant_id: tenant_id,
        email: guestEmail as string & tags.Format<"email">,
        password_hash: guestPasswordHash,
        first_name: guestFirstName,
        last_name: guestLastName,
        status: guestStatus,
      } satisfies IEnterpriseLmsGuest.ICreate,
    });
  typia.assert(guest);

  // 2. Prepare a valid assessmentId for testing pagination search
  const assessmentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Define a valid pagination and search request body
  const requestBody = {
    page: 1,
    limit: 10,
    search: null,
    status: null,
    assessment_id: assessmentId satisfies string as string &
      tags.Format<"uuid">,
    orderBy: "created_at desc",
  } satisfies IEnterpriseLmsProctoredExam.IRequest;

  // 4. Perform the paginated search for proctored exams as guest user
  const pageResult: IPageIEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.guest.assessments.proctoredExams.index(
      connection,
      {
        assessmentId: assessmentId,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // 5. Validate pagination info
  TestValidator.predicate(
    "pagination current page >= 1",
    pageResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    pageResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count >= 0",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count >= 0",
    pageResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages count >= current page",
    pageResult.pagination.pages >= pageResult.pagination.current,
  );

  // 6. Validate data items
  TestValidator.predicate(
    "each item has matching assessment_id",
    pageResult.data.every((exam) => exam.assessment_id === assessmentId),
  );
  for (const exam of pageResult.data) {
    typia.assert(exam);
    TestValidator.predicate(
      "status is in allowed enums",
      ["scheduled", "in_progress", "completed", "cancelled"].includes(
        exam.status,
      ),
    );
  }

  // 7. Test unauthorized error for missing token by using an unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "guest proctored exams pagination search unauthorized",
    async () => {
      await api.functional.enterpriseLms.guest.assessments.proctoredExams.index(
        unauthenticatedConnection,
        { assessmentId: assessmentId, body: requestBody },
      );
    },
  );

  // 8. Test error for invalid assessment ID format
  await TestValidator.error(
    "guest proctored exams pagination search invalid assessmentId",
    async () => {
      await api.functional.enterpriseLms.guest.assessments.proctoredExams.index(
        connection,
        {
          assessmentId: "invalid-uuid-format",
          body: requestBody,
        },
      );
    },
  );
}
