import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementQa";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

/**
 * Test the QA user search functionality with pagination and filtering for
 * PMO role.
 *
 * This test performs the full workflow of registering and authenticating a
 * PMO user, then executing multiple filtered search queries on the QA user
 * data via PATCH /taskManagement/pmo/taskManagement/qas.
 *
 * It validates that the PMO user can filter by email, name, creation and
 * update timestamps, paginate results, and verifies the correctness of
 * pagination metadata and the data integrity.
 *
 * The test also verifies that unauthorized access (without login) is
 * properly rejected.
 */
export async function test_api_qa_search_paginated_filtered_list_pmo_role(
  connection: api.IConnection,
) {
  // Step 1: Register a new PMO user via join endpoint
  const pmoEmail = typia.random<string & tags.Format<"email">>();
  const pmoName = RandomGenerator.name(2);
  // A secure example password meeting realistic complexity
  const pmoPassword = "Password123!";

  const joinOutput = await api.functional.auth.pmo.join(connection, {
    body: {
      email: pmoEmail,
      name: pmoName,
      password: pmoPassword,
    } satisfies ITaskManagementPmo.IJoin,
  });
  typia.assert(joinOutput);

  // Step 2: Login to get authorization for PMO user
  const loginOutput = await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoEmail,
      password: pmoPassword,
    } satisfies ITaskManagementPmo.ILogin,
  });
  typia.assert(loginOutput);

  // Step 3: Define multiple filter scenarios for search endpoint
  const searches: Partial<ITaskManagementQa.IRequest>[] = [
    { email: pmoEmail.substring(0, Math.min(pmoEmail.length, 5)) },
    { name: pmoName.substring(0, Math.min(pmoName.length, 3)) },
    { created_at: new Date(Date.now() - 864e5).toISOString() }, // 1 day ago
    { updated_at: new Date(Date.now() - 864e5).toISOString() }, // 1 day ago
  ];

  // Step 4: Perform concurrent search requests with pagination
  await Promise.all(
    searches.map(async (search) => {
      // Generate a random page number between 1 and 10
      const page = Math.floor(Math.random() * 10) + 1;
      const limit = 5; // Fixed limit for pagination

      // Compose request body, using explicit null for absent values
      const requestBody = {
        email: search.email ?? null,
        name: search.name ?? null,
        created_at: search.created_at ?? null,
        updated_at: search.updated_at ?? null,
        page: page,
        limit: limit,
        sort: null,
      } satisfies ITaskManagementQa.IRequest;

      // Call search endpoint
      const output =
        await api.functional.taskManagement.pmo.taskManagement.qas.index(
          connection,
          {
            body: requestBody,
          },
        );
      typia.assert(output);

      // Validate pagination metadata
      TestValidator.predicate(
        "pagination current page must be positive",
        output.pagination.current > 0,
      );
      TestValidator.predicate(
        "pagination limit must be positive",
        output.pagination.limit > 0,
      );
      TestValidator.predicate(
        "pagination pages must not be negative",
        output.pagination.pages >= 0,
      );
      TestValidator.predicate(
        "pagination records must not be negative",
        output.pagination.records >= 0,
      );

      // Validate each data item complies with QA summary structure
      output.data.forEach((qa) => {
        typia.assert(qa);
        TestValidator.predicate(
          "QA user email must be valid format",
          /^[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(qa.email),
        );
        typia.assert(qa.id); // asserts UUID format internally
        TestValidator.predicate(
          "QA user name must be non-empty",
          qa.name.length > 0,
        );
      });
    }),
  );

  // Step 5: Verify unauthorized access is rejected
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access should be rejected",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.qas.index(
        unauthenticatedConn,
        {
          body: {
            page: 1,
            limit: 5,
          } satisfies ITaskManagementQa.IRequest,
        },
      );
    },
  );
}
