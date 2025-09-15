import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatuses";
import type { ITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatuses";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_task_management_task_statuses_search_and_pagination_tpm_role(
  connection: api.IConnection,
) {
  // 1. TPM user registration via join endpoint
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ComplexP@ssw0rd123",
    name: RandomGenerator.name(1),
  } satisfies ITaskManagementTpm.IJoin;

  const joinResponse: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: joinBody,
    });
  typia.assert(joinResponse);

  // 2. TPM user login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;

  const loginResponse: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResponse);

  // 3. Search and list taskManagementTaskStatuses
  const searchBody = {
    code: RandomGenerator.name(1),
    name: RandomGenerator.name(1),
    page: 1,
    limit: 10,
    orderBy: "code",
  } satisfies ITaskManagementTaskStatuses.IRequest;

  const listResponse: IPageITaskManagementTaskStatuses.ISummary =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.index(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(listResponse);

  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is positive",
    listResponse.pagination.current > 0,
  );

  TestValidator.predicate(
    "pagination limit is positive",
    listResponse.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records is non-negative",
    listResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages is positive or zero",
    listResponse.pagination.pages >= 0,
  );

  TestValidator.equals(
    "pagination pages equals calculated pages",
    listResponse.pagination.pages,
    Math.ceil(listResponse.pagination.records / listResponse.pagination.limit),
  );

  // 5. Validate each task status in the list
  for (const status of listResponse.data) {
    typia.assert(status);

    TestValidator.predicate(
      "task status code contains filter string",
      searchBody.code === null ||
        searchBody.code === undefined ||
        status.code.includes(searchBody.code),
    );

    TestValidator.predicate(
      "task status name contains filter string",
      searchBody.name === null ||
        searchBody.name === undefined ||
        status.name.includes(searchBody.name),
    );

    TestValidator.predicate(
      "task status description is nullable and any",
      typeof status.description === "string" ||
        status.description === null ||
        status.description === undefined,
    );
  }

  // 6. Test unauthorized access
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized access should be rejected",
    async () => {
      await api.functional.taskManagement.tpm.taskManagementTaskStatuses.index(
        unauthConnection,
        { body: searchBody },
      );
    },
  );
}
