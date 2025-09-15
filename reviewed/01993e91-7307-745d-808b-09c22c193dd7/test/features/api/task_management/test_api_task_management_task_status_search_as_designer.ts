import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatuses";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatuses";

export async function test_api_task_management_task_status_search_as_designer(
  connection: api.IConnection,
) {
  // 1. Register designer user
  const email = typia.random<string & tags.Format<"email">>();
  const password_hash = RandomGenerator.alphaNumeric(64); // simulate hashed pw
  const name = RandomGenerator.name();
  const joinBody = {
    email,
    password_hash,
    name,
  } satisfies ITaskManagementDesigner.ICreate;
  const authorized: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2. Login designer user
  const loginBody = {
    email,
    password: password_hash,
  } satisfies ITaskManagementDesigner.ILogin;
  const loginAuthorized: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.login(connection, { body: loginBody });
  typia.assert(loginAuthorized);

  // 3. Search for task statuses with no filter (defaults)
  const defaultSearchBody = {
    code: null,
    name: null,
    page: 1,
    limit: 10,
    orderBy: null,
  } satisfies ITaskManagementTaskStatuses.IRequest;

  const defaultSearchResult: IPageITaskManagementTaskStatuses.ISummary =
    await api.functional.taskManagement.designer.taskManagementTaskStatuses.index(
      connection,
      { body: defaultSearchBody },
    );

  typia.assert(defaultSearchResult);
  TestValidator.predicate(
    "default search page >= 1",
    defaultSearchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default search limit > 0",
    defaultSearchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "default search pages >= 0",
    defaultSearchResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "default search records >= 0",
    defaultSearchResult.pagination.records >= 0,
  );
  TestValidator.equals(
    "default search page matches request",
    defaultSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default search limit matches request",
    defaultSearchResult.pagination.limit,
    10,
  );

  // 4. Search filtering by code
  if (defaultSearchResult.data.length > 0) {
    const sampleCode = defaultSearchResult.data[0].code;
    const codeFilterBody = {
      code: sampleCode,
      name: null,
      page: 1,
      limit: 5,
      orderBy: null,
    } satisfies ITaskManagementTaskStatuses.IRequest;

    const filteredByCode: IPageITaskManagementTaskStatuses.ISummary =
      await api.functional.taskManagement.designer.taskManagementTaskStatuses.index(
        connection,
        { body: codeFilterBody },
      );

    typia.assert(filteredByCode);

    // Pagination checks
    TestValidator.predicate(
      "code filter: page >= 1",
      filteredByCode.pagination.current >= 1,
    );
    TestValidator.predicate(
      "code filter: limit > 0",
      filteredByCode.pagination.limit > 0,
    );
    TestValidator.predicate(
      "code filter: pages >= 0",
      filteredByCode.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "code filter: records >= 0",
      filteredByCode.pagination.records >= 0,
    );
    TestValidator.predicate(
      "code filter: data length does not exceed limit",
      filteredByCode.data.length <= filteredByCode.pagination.limit,
    );

    // Ensure result data codes exactly match filter
    for (const status of filteredByCode.data) {
      TestValidator.predicate(
        `code filter: all entries must have code '${sampleCode}'`,
        status.code === sampleCode,
      );
    }
  }

  // 5. Search filtering by name
  if (defaultSearchResult.data.length > 0) {
    const sampleName = defaultSearchResult.data[0].name;
    const nameFilterBody = {
      code: null,
      name: sampleName,
      page: 1,
      limit: 5,
      orderBy: null,
    } satisfies ITaskManagementTaskStatuses.IRequest;

    const filteredByName: IPageITaskManagementTaskStatuses.ISummary =
      await api.functional.taskManagement.designer.taskManagementTaskStatuses.index(
        connection,
        { body: nameFilterBody },
      );

    typia.assert(filteredByName);

    // Pagination checks
    TestValidator.predicate(
      "name filter: page >= 1",
      filteredByName.pagination.current >= 1,
    );
    TestValidator.predicate(
      "name filter: limit > 0",
      filteredByName.pagination.limit > 0,
    );
    TestValidator.predicate(
      "name filter: pages >= 0",
      filteredByName.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "name filter: records >= 0",
      filteredByName.pagination.records >= 0,
    );
    TestValidator.predicate(
      "name filter: data length does not exceed limit",
      filteredByName.data.length <= filteredByName.pagination.limit,
    );

    for (const status of filteredByName.data) {
      TestValidator.predicate(
        `name filter: all statuses should have name '${sampleName}'`,
        status.name === sampleName,
      );
    }
  }
}
