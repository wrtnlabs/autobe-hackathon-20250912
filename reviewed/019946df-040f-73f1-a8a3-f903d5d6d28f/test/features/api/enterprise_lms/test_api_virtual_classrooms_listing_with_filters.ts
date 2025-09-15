import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsVirtualClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsVirtualClassroom";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsVirtualClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsVirtualClassroom";

export async function test_api_virtual_classrooms_listing_with_filters(
  connection: api.IConnection,
) {
  // 1. Register a new corporate learner
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const learnerCreate = {
    tenant_id: tenantId,
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "Pass1234!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const learner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: learnerCreate,
    });
  typia.assert(learner);

  // 2. Login as the corporate learner
  const learnerLogin = {
    email: learnerCreate.email,
    password: learnerCreate.password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const loggedInLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: learnerLogin,
    });
  typia.assert(loggedInLearner);

  // 3. Define search requests with different filters
  const requests = [
    {
      // Basic search request with pagination and order
      search: null,
      page: 1,
      limit: 10,
      order: "asc",
      instructor_id: null,
      status: null,
    } satisfies IEnterpriseLmsVirtualClassroom.IRequest,
    {
      // Search by keyword and descending order
      search: RandomGenerator.paragraph({ sentences: 2 }),
      page: 1,
      limit: 5,
      order: "desc",
      instructor_id: null,
      status: "scheduled",
    } satisfies IEnterpriseLmsVirtualClassroom.IRequest,
    {
      // Filter by a random instructor id
      search: null,
      page: 2,
      limit: 3,
      order: "asc",
      instructor_id: typia.random<string & tags.Format<"uuid">>(),
      status: "completed",
    } satisfies IEnterpriseLmsVirtualClassroom.IRequest,
    {
      // Non-existing filter should return empty data
      search: "nonexistingkeyword",
      page: 1,
      limit: 10,
      order: "asc",
      instructor_id: null,
      status: "cancelled",
    } satisfies IEnterpriseLmsVirtualClassroom.IRequest,
  ];

  // 4. Iterate each filter request and test the API
  for (const req of requests) {
    const result: IPageIEnterpriseLmsVirtualClassroom.ISummary =
      await api.functional.enterpriseLms.corporateLearner.virtualClassrooms.searchVirtualClassrooms(
        connection,
        { body: req },
      );
    typia.assert(result);

    // Validate pagination properties
    TestValidator.predicate(
      "Pagination current page should be >= 0",
      result.pagination.current >= 0,
    );
    TestValidator.predicate(
      "Pagination limit should be >= 0",
      result.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "Pagination records should be >= 0",
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      "Pagination pages should be >= 0",
      result.pagination.pages >= 0,
    );

    // Validate each virtual classroom in the list
    for (const classroom of result.data) {
      typia.assert(classroom);

      TestValidator.predicate(
        "Classroom tenant_id must match learner tenant_id",
        classroom.tenant_id === learner.tenant_id,
      );

      // Validate dates
      TestValidator.predicate(
        "start_at should be before or equal to end_at",
        new Date(classroom.start_at).getTime() <=
          new Date(classroom.end_at).getTime(),
      );
    }
  }
}
