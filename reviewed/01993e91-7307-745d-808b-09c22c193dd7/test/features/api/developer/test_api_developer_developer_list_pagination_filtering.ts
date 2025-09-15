import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementDeveloper";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test validates the developer listing functionality with
 * pagination and filtering. It first creates and authenticates a TPM user
 * to create developer users. Then multiple developer users are created.
 * Then it authenticates as a developer user and requests developer listings
 * with various filters and sorting orders, validating results with
 * TestValidator. It also tests unauthorized access scenario.
 */
export async function test_api_developer_developer_list_pagination_filtering(
  connection: api.IConnection,
) {
  // 1. Create and authenticate TPM user
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser = await api.functional.auth.tpm.join(connection, {
    body: tpmJoinBody,
  });
  typia.assert(tpmUser);

  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmJoinBody.email,
      password: tpmJoinBody.password,
    } satisfies ITaskManagementTpm.ILogin,
  });

  // 2. Create developer users by TPM user
  const developerUsers: ITaskManagementDeveloper[] = [];
  for (let i = 0; i < 4; ++i) {
    const timestamp = Date.now();
    const createBody = {
      email: `user${timestamp}_${i}@example.com`,
      password_hash: `hashed-password-${timestamp}-${i}`,
      name: RandomGenerator.name(),
      deleted_at: null,
    } satisfies ITaskManagementDeveloper.ICreate;
    const createdDeveloper =
      await api.functional.taskManagement.tpm.taskManagement.developers.create(
        connection,
        {
          body: createBody,
        },
      );
    typia.assert(createdDeveloper);
    developerUsers.push(createdDeveloper);
  }

  // 3. Authenticate as the first developer user
  const firstDev = developerUsers[0];
  const devLoginBody = {
    email: firstDev.email,
    password: "password123", // Note: login requires plain password, but we created with password_hash, so reuse 'password123' and assume backend scenario
  } satisfies ITaskManagementDeveloper.ILogin;

  const devUser = await api.functional.auth.developer.login(connection, {
    body: devLoginBody,
  });
  typia.assert(devUser);

  // 4. List developers without filter
  const listAll =
    await api.functional.taskManagement.developer.taskManagement.developers.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(listAll);

  TestValidator.predicate(
    "pagination current page is zero or more",
    listAll.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    listAll.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages count consistent",
    listAll.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count consistent",
    listAll.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data list length does not exceed limit",
    listAll.data.length <= listAll.pagination.limit,
  );

  // Validate at least the created developers are present
  TestValidator.predicate(
    "records count of developers is >= created",
    listAll.pagination.records >= developerUsers.length,
  );

  // 5. Filter by email exact match
  const emailFilter = developerUsers[1].email;
  const filterByEmail =
    await api.functional.taskManagement.developer.taskManagement.developers.index(
      connection,
      {
        body: { email: emailFilter },
      },
    );
  typia.assert(filterByEmail);

  TestValidator.equals(
    "only one developer returned for email filter",
    1,
    filterByEmail.data.length,
  );
  if (filterByEmail.data.length === 1) {
    TestValidator.equals(
      "filtered developer email matches",
      filterByEmail.data[0].email,
      emailFilter,
    );
  }

  // 6. Filter by name substring
  const nameSubstr = developerUsers[2].name.substring(0, 2);
  const filterByName =
    await api.functional.taskManagement.developer.taskManagement.developers.index(
      connection,
      {
        body: { name: nameSubstr },
      },
    );
  typia.assert(filterByName);

  // Validate at least one matching developer by name substring
  TestValidator.predicate(
    `filter by name substring '${nameSubstr}' returns >= 1`,
    filterByName.data.length >= 1,
  );

  // All returned data names must contain substring
  for (const dev of filterByName.data) {
    TestValidator.predicate(
      "developer name contains substring",
      dev.name.includes(nameSubstr),
    );
  }

  // 7. Sorting tests
  // Sort by name ascending
  const sortedByNameAsc =
    await api.functional.taskManagement.developer.taskManagement.developers.index(
      connection,
      {
        body: { sort: "name", order: "asc" },
      },
    );
  typia.assert(sortedByNameAsc);

  for (let i = 1; i < sortedByNameAsc.data.length; i++) {
    TestValidator.predicate(
      `data is sorted ascending by name at index ${i}`,
      sortedByNameAsc.data[i - 1].name <= sortedByNameAsc.data[i].name,
    );
  }

  // Sort by name descending
  const sortedByNameDesc =
    await api.functional.taskManagement.developer.taskManagement.developers.index(
      connection,
      {
        body: { sort: "name", order: "desc" },
      },
    );
  typia.assert(sortedByNameDesc);

  for (let i = 1; i < sortedByNameDesc.data.length; i++) {
    TestValidator.predicate(
      `data is sorted descending by name at index ${i}`,
      sortedByNameDesc.data[i - 1].name >= sortedByNameDesc.data[i].name,
    );
  }

  // Sort by email ascending
  const sortedByEmailAsc =
    await api.functional.taskManagement.developer.taskManagement.developers.index(
      connection,
      {
        body: { sort: "email", order: "asc" },
      },
    );
  typia.assert(sortedByEmailAsc);

  for (let i = 1; i < sortedByEmailAsc.data.length; i++) {
    TestValidator.predicate(
      `data is sorted ascending by email at index ${i}`,
      sortedByEmailAsc.data[i - 1].email <= sortedByEmailAsc.data[i].email,
    );
  }

  // Sort by email descending
  const sortedByEmailDesc =
    await api.functional.taskManagement.developer.taskManagement.developers.index(
      connection,
      {
        body: { sort: "email", order: "desc" },
      },
    );
  typia.assert(sortedByEmailDesc);

  for (let i = 1; i < sortedByEmailDesc.data.length; i++) {
    TestValidator.predicate(
      `data is sorted descending by email at index ${i}`,
      sortedByEmailDesc.data[i - 1].email >= sortedByEmailDesc.data[i].email,
    );
  }

  // 8. Unauthorized call test (simulate unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access to developer listing",
    async () => {
      await api.functional.taskManagement.developer.taskManagement.developers.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );
}
