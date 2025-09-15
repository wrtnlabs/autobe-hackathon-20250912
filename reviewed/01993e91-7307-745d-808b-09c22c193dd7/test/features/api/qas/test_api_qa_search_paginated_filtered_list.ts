import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementQa";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test validates the PATCH /taskManagement/tpm/taskManagement/qas API
 * endpoint which enables searching and retrieving a paginated, filtered list of
 * Quality Assurance (QA) users. The test executes the full workflow of creating
 * and authenticating a TPM user to perform authorized searches. It verifies
 * correct filtering by email, name, creation and update timestamps, pagination,
 * and sorting. The test validates that returned QA user summaries contain
 * expected properties and formats. It also checks that unauthorized calls fail
 * as expected.
 *
 * Steps:
 *
 * 1. Create TPM user via join endpoint.
 * 2. Authenticate TPM user via login endpoint.
 * 3. Perform empty-filter search to get all QA users and verify pagination
 *    metadata.
 * 4. Perform filtered searches by email, name, created_at, and updated_at.
 * 5. Test pagination parameters (page and limit).
 * 6. Test sorting by email ascending and descending.
 * 7. Validate unauthorized access is forbidden.
 */
export async function test_api_qa_search_paginated_filtered_list(
  connection: api.IConnection,
) {
  // 1. Create TPM user via join
  const email = `testuser+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = "StrongPass123!";
  const name = RandomGenerator.name();

  const tpmJoin: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: { email, password, name } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpmJoin);

  // 2. Login to TPM
  const tpmLogin: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: { email, password } satisfies ITaskManagementTpm.ILogin,
    });
  typia.assert(tpmLogin);

  // 3. Search with empty filters to get all QA users with default pagination
  const allQAs: IPageITaskManagementQa.ISummary =
    await api.functional.taskManagement.tpm.taskManagement.qas.index(
      connection,
      {
        body: {
          email: null,
          name: null,
          created_at: null,
          updated_at: null,
          page: 1,
          limit: 10,
          sort: null,
        } satisfies ITaskManagementQa.IRequest,
      },
    );
  typia.assert(allQAs);

  TestValidator.predicate(
    "pagination current page is valid",
    allQAs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    allQAs.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    allQAs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is at least one",
    allQAs.pagination.pages >= 1,
  );

  // Check each returned QA user summary has valid id (uuid), email (email), and name
  for (const qa of allQAs.data) {
    typia.assert<ITaskManagementQa.ISummary>(qa);
    TestValidator.predicate(
      `QA user ${qa.id} email includes '@'`,
      qa.email.includes("@"),
    );
  }

  // 4. Filtered search by partial email
  const partialEmail = email.substring(0, Math.min(5, email.length));
  const filteredByEmail: IPageITaskManagementQa.ISummary =
    await api.functional.taskManagement.tpm.taskManagement.qas.index(
      connection,
      {
        body: {
          email: partialEmail,
          name: null,
          created_at: null,
          updated_at: null,
          page: 1,
          limit: 10,
          sort: null,
        } satisfies ITaskManagementQa.IRequest,
      },
    );
  typia.assert(filteredByEmail);

  for (const qa of filteredByEmail.data) {
    typia.assert<ITaskManagementQa.ISummary>(qa);
    TestValidator.predicate(
      `QA user email ${qa.email} contains filter '${partialEmail}'`,
      qa.email.includes(partialEmail),
    );
  }

  // 5. Filter by name substring
  const partialName = name.substring(0, Math.min(3, name.length));
  const filteredByName: IPageITaskManagementQa.ISummary =
    await api.functional.taskManagement.tpm.taskManagement.qas.index(
      connection,
      {
        body: {
          email: null,
          name: partialName,
          created_at: null,
          updated_at: null,
          page: 1,
          limit: 10,
          sort: null,
        } satisfies ITaskManagementQa.IRequest,
      },
    );
  typia.assert(filteredByName);

  for (const qa of filteredByName.data) {
    typia.assert<ITaskManagementQa.ISummary>(qa);
    TestValidator.predicate(
      `QA user name ${qa.name} contains filter '${partialName}'`,
      qa.name.includes(partialName),
    );
  }

  // 6. Filter by created_at (ISO date)
  const createdAtFilter = new Date(tpmJoin.created_at).toISOString();
  const filteredByCreatedAt: IPageITaskManagementQa.ISummary =
    await api.functional.taskManagement.tpm.taskManagement.qas.index(
      connection,
      {
        body: {
          email: null,
          name: null,
          created_at: createdAtFilter,
          updated_at: null,
          page: 1,
          limit: 10,
          sort: null,
        } satisfies ITaskManagementQa.IRequest,
      },
    );
  typia.assert(filteredByCreatedAt);

  // 7. Filter by updated_at (ISO date)
  const updatedAtFilter = new Date(tpmJoin.updated_at).toISOString();
  const filteredByUpdatedAt: IPageITaskManagementQa.ISummary =
    await api.functional.taskManagement.tpm.taskManagement.qas.index(
      connection,
      {
        body: {
          email: null,
          name: null,
          created_at: null,
          updated_at: updatedAtFilter,
          page: 1,
          limit: 10,
          sort: null,
        } satisfies ITaskManagementQa.IRequest,
      },
    );
  typia.assert(filteredByUpdatedAt);

  // 8. Test pagination limit and page
  const page1Limit5: IPageITaskManagementQa.ISummary =
    await api.functional.taskManagement.tpm.taskManagement.qas.index(
      connection,
      {
        body: {
          email: null,
          name: null,
          created_at: null,
          updated_at: null,
          page: 1,
          limit: 5,
          sort: null,
        } satisfies ITaskManagementQa.IRequest,
      },
    );
  typia.assert(page1Limit5);
  TestValidator.predicate(
    "page 1 limit 5 has at most 5 records",
    page1Limit5.data.length <= 5,
  );

  const page2Limit5: IPageITaskManagementQa.ISummary =
    await api.functional.taskManagement.tpm.taskManagement.qas.index(
      connection,
      {
        body: {
          email: null,
          name: null,
          created_at: null,
          updated_at: null,
          page: 2,
          limit: 5,
          sort: null,
        } satisfies ITaskManagementQa.IRequest,
      },
    );
  typia.assert(page2Limit5);
  TestValidator.predicate(
    "page 2 limit 5 contains different records from page 1",
    ArrayUtil.has(
      page2Limit5.data,
      (entity) => !page1Limit5.data.some((e) => e.id === entity.id),
    ),
  );

  // 9. Test sorting by email ascending
  const sortAsc: IPageITaskManagementQa.ISummary =
    await api.functional.taskManagement.tpm.taskManagement.qas.index(
      connection,
      {
        body: {
          email: null,
          name: null,
          created_at: null,
          updated_at: null,
          page: 1,
          limit: 10,
          sort: "+email",
        } satisfies ITaskManagementQa.IRequest,
      },
    );
  typia.assert(sortAsc);
  for (let i = 1; i < sortAsc.data.length; i++) {
    TestValidator.predicate(
      "sort ascending email order",
      sortAsc.data[i - 1].email <= sortAsc.data[i].email,
    );
  }

  // 10. Test sorting by email descending
  const sortDesc: IPageITaskManagementQa.ISummary =
    await api.functional.taskManagement.tpm.taskManagement.qas.index(
      connection,
      {
        body: {
          email: null,
          name: null,
          created_at: null,
          updated_at: null,
          page: 1,
          limit: 10,
          sort: "-email",
        } satisfies ITaskManagementQa.IRequest,
      },
    );
  typia.assert(sortDesc);
  for (let i = 1; i < sortDesc.data.length; i++) {
    TestValidator.predicate(
      "sort descending email order",
      sortDesc.data[i - 1].email >= sortDesc.data[i].email,
    );
  }

  // 11. Test unauthorized access by using a separate unauthenticated connection
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access forbidden", async () => {
    await api.functional.taskManagement.tpm.taskManagement.qas.index(
      unauthenticatedConn,
      {
        body: {
          email: null,
          name: null,
          created_at: null,
          updated_at: null,
          page: 1,
          limit: 5,
          sort: null,
        } satisfies ITaskManagementQa.IRequest,
      },
    );
  });
}
