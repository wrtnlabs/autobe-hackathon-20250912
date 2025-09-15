import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTpm";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Validate that a TPM user can retrieve a paginated and filtered list of
 * TPM accounts after authentication.
 *
 * This test simulates the following scenario:
 *
 * 1. TPM user joins (registers) with proper credentials.
 * 2. TPM user logs in to obtain authorization.
 * 3. Multiple TPM user accounts are created to seed data.
 * 4. The logged-in TPM user requests a paginated and optionally filtered list
 *    of TPM accounts.
 * 5. Assert the response structure matches pagination expectations and
 *    contains correct account data.
 * 6. Attempt to access the TPM list with an unauthenticated connection and
 *    assert failure.
 *
 * This test ensures business rules related to TPM list retrieval, filters,
 * pagination, and authorization are rigorously validated.
 */
export async function test_api_technical_project_manager_list_by_tpm(
  connection: api.IConnection,
) {
  // 1. TPM user joins
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: joinBody,
    });
  typia.assert(tpmAuthorized);

  // 2. TPM user login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;

  const tpmLoginAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: loginBody,
    });
  typia.assert(tpmLoginAuthorized);

  // 3. Create multiple TPM users for list seeding
  // For testing pagination and filtering, create 10 TPM users
  const createdTpms: ITaskManagementTpm[] = [];
  for (let i = 0; i < 10; i++) {
    const createBody = {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies ITaskManagementTpm.ICreate;
    const created: ITaskManagementTpm =
      await api.functional.taskManagement.tpm.taskManagement.tpms.create(
        connection,
        {
          body: createBody,
        },
      );
    typia.assert(created);
    createdTpms.push(created);
  }

  // 4. Retrieve paginated TPM list with filtering
  // Use filter: search string that matches part of a TPM email or name from created ones
  // Use pagination: page 1, limit 5 (half of created)

  // Pick one created TPM for filtering search term
  const sampleTpm = RandomGenerator.pick(createdTpms);
  const searchTerm = sampleTpm.email.substring(0, 3); // partial email search

  const requestBody = {
    page: 1,
    limit: 5,
    search: searchTerm,
  } satisfies ITaskManagementTpm.IRequest;

  const pagedResult: IPageITaskManagementTpm.ISummary =
    await api.functional.taskManagement.tpm.taskManagement.tpms.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(pagedResult);

  // Validate pagination info
  TestValidator.predicate(
    "pagination current page is >= 1",
    pagedResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is > 0",
    pagedResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total pages is >= 1",
    pagedResult.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "total records count is >= 0",
    pagedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "result data count less or equal to pagination limit",
    pagedResult.data.length <= pagedResult.pagination.limit,
  );
  TestValidator.predicate(
    "total pages equals ceil(records / limit)",
    pagedResult.pagination.pages ===
      Math.ceil(pagedResult.pagination.records / pagedResult.pagination.limit),
  );

  // Validate that each item in data matches the search query in email or name
  for (const item of pagedResult.data) {
    typia.assert(item);
    TestValidator.predicate(
      `item email or name includes search term '${searchTerm}'`,
      item.email.includes(searchTerm) || item.name.includes(searchTerm),
    );
  }

  // 5. Negative test: attempt to access TPM index with unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized access to TPM list should fail",
    async () => {
      await api.functional.taskManagement.tpm.taskManagement.tpms.index(
        unauthenticatedConnection,
        {
          body: {
            page: 1,
            limit: 5,
            search: null,
          } satisfies ITaskManagementTpm.IRequest,
        },
      );
    },
  );
}
