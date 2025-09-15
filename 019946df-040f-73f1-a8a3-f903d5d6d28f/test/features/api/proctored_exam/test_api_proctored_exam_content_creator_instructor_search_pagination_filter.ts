import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsProctoredExam";

export async function test_api_proctored_exam_content_creator_instructor_search_pagination_filter(
  connection: api.IConnection,
) {
  // Step 1: Join a new contentCreatorInstructor user
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const passwordPlain = "ChangeMe123!";
  const passwordHash = typia.random<string>(); // Simulate hashed password

  const contentCreatorInstructorBody = {
    tenant_id: tenantId,
    email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: passwordHash,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const contentCreatorInstructorAuth: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: contentCreatorInstructorBody,
    });
  typia.assert(contentCreatorInstructorAuth);

  // Step 2: Login with created user to obtain authorization
  const loginInput = {
    email: contentCreatorInstructorBody.email,
    password: passwordPlain,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  const contentCreatorInstructorLogin: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: loginInput,
    });
  typia.assert(contentCreatorInstructorLogin);

  TestValidator.equals(
    "tenant_id must match",
    contentCreatorInstructorLogin.tenant_id,
    tenantId,
  );

  // Step 3: Use the assessmentId from the authorized user context or generate new UUID
  // As we have no real assessment creation endpoint, simulate assessmentId
  const assessmentId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Prepare multiple proctored exam data related to the assessment
  // Since we do not have proctored exam creation API, simulate occurrences and call directly

  // Compose search, pagination and filtering test bodies
  // We'll create a helper to create realistic paging/filtering requests

  function createRequest(
    overrides: Partial<IEnterpriseLmsProctoredExam.IRequest> = {},
  ) {
    // Choose random page between 1 and 3
    const page = overrides.page ?? RandomGenerator.pick([1, 2, 3]);
    // Choose random limit between 3 and 7
    const limit = overrides.limit ?? RandomGenerator.pick([3, 5, 7]);
    // Choose search string from a substring of fake exam_session_id, or null
    const search = overrides.search ?? null;
    // Status filter or null
    const status = overrides.status ?? null;
    // Sorting field, default created_at desc
    const orderBy = overrides.orderBy ?? "created_at DESC";

    return {
      page,
      limit,
      search,
      status,
      orderBy,
    } satisfies IEnterpriseLmsProctoredExam.IRequest;
  }

  // Step 5: Query the endpoint multiple times with different filters

  // 5.a: Simple no filter - return page 1 limit 5 sorted descending
  const allResponse =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.proctoredExams.index(
      connection,
      {
        assessmentId,
        body: createRequest({ page: 1, limit: 5, orderBy: "created_at DESC" }),
      },
    );
  typia.assert(allResponse);

  // Validate pagination fields
  TestValidator.predicate(
    "pagination current page is 1",
    allResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 5",
    allResponse.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    allResponse.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is correct ceil(records/limit)",
    allResponse.pagination.pages ===
      Math.ceil(allResponse.pagination.records / allResponse.pagination.limit),
  );

  // Validate all returned proctored exams belong to the assessmentId and tenant
  for (const exam of allResponse.data) {
    typia.assert(exam);
    TestValidator.equals(
      "exam.assessment_id must match requested assessment",
      exam.assessment_id,
      assessmentId,
    );
  }

  // 5.b: Search filter, pick substring from any exam_session_id
  if (allResponse.data.length > 0) {
    const sampleExam = RandomGenerator.pick(allResponse.data);
    const sessionIdPart = sampleExam.exam_session_id.substring(0, 4);

    const searchResponse =
      await api.functional.enterpriseLms.contentCreatorInstructor.assessments.proctoredExams.index(
        connection,
        {
          assessmentId,
          body: createRequest({
            search: sessionIdPart,
            page: 1,
            limit: 10,
            orderBy: "exam_session_id ASC",
          }),
        },
      );
    typia.assert(searchResponse);

    // Validate all returned session ids contain the search substring
    for (const exam of searchResponse.data) {
      typia.assert(exam);
      TestValidator.predicate(
        `exam_session_id includes search filter '${sessionIdPart}'`,
        exam.exam_session_id.includes(sessionIdPart),
      );
      TestValidator.equals(
        "exam.assessment_id must match",
        exam.assessment_id,
        assessmentId,
      );
    }
  }

  // 5.c: Status filter test with enum values
  const statuses: Array<
    "scheduled" | "in_progress" | "completed" | "cancelled"
  > = ["scheduled", "in_progress", "completed", "cancelled"];
  for (const statusFilter of statuses) {
    const statusResponse =
      await api.functional.enterpriseLms.contentCreatorInstructor.assessments.proctoredExams.index(
        connection,
        {
          assessmentId,
          body: createRequest({ status: statusFilter, page: 1, limit: 10 }),
        },
      );
    typia.assert(statusResponse);

    // Validate all returned status match the filter
    for (const exam of statusResponse.data) {
      typia.assert(exam);
      TestValidator.equals(
        `exam status must equal filter '${statusFilter}'`,
        exam.status,
        statusFilter,
      );
      TestValidator.equals(
        "exam.assessment_id must match",
        exam.assessment_id,
        assessmentId,
      );
    }
  }

  // 5.d: Sorting test ascending by created_at
  const ascResponse =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.proctoredExams.index(
      connection,
      {
        assessmentId,
        body: createRequest({ orderBy: "created_at ASC", page: 1, limit: 10 }),
      },
    );
  typia.assert(ascResponse);

  // Validate ascending order of created_at
  for (let i = 1; i < ascResponse.data.length; i++) {
    const prev = ascResponse.data[i - 1];
    const curr = ascResponse.data[i];
    TestValidator.predicate(
      "created_at ascending order",
      prev.created_at <= curr.created_at,
    );
  }

  // 5.e: Sorting test descending by created_at
  const descResponse =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.proctoredExams.index(
      connection,
      {
        assessmentId,
        body: createRequest({ orderBy: "created_at DESC", page: 1, limit: 10 }),
      },
    );
  typia.assert(descResponse);

  // Validate descending order of created_at
  for (let i = 1; i < descResponse.data.length; i++) {
    const prev = descResponse.data[i - 1];
    const curr = descResponse.data[i];
    TestValidator.predicate(
      "created_at descending order",
      prev.created_at >= curr.created_at,
    );
  }

  // Step 8: Authorization failure test - try call without valid token
  // Create unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized access must be rejected",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.assessments.proctoredExams.index(
        unauthConn,
        {
          assessmentId,
          body: createRequest({ page: 1, limit: 5 }),
        },
      );
    },
  );
}
