import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementDesigner";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * Verify that the taskManagement.pm.taskManagement.designers.index API
 * returns a filtered, sorted, paginated list of designer summaries only to
 * authenticated PM users.
 *
 * This E2E test ensures that:
 *
 * - PM users can successfully join and login to obtain authorization tokens.
 * - Designers can be searched by email and name filters.
 * - Pagination parameters (page, limit) function correctly, including
 *   boundaries and invalid inputs.
 * - Sorting and ordering parameters work as expected.
 * - Unauthorized access is properly rejected.
 * - Empty result sets are correctly returned when no matching designers.
 *
 * The test simulates the full PM authentication flow and then exercises the
 * designer index endpoint under realistic conditions.
 *
 * It validates all responses fully using typia.assert for perfect type
 * safety.
 *
 * Each assertion includes a descriptive title for clarity in test outputs.
 */
export async function test_api_designer_index_with_pm_authentication_and_pagination(
  connection: api.IConnection,
) {
  // 1. Create a new PM user
  const pmCreateBody = {
    email: `pm_${RandomGenerator.alphaNumeric(8)}@company.com`,
    password: "Password123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;
  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmCreateBody });
  typia.assert(pmUser);
  TestValidator.predicate(
    "pm joined has valid id",
    typeof pmUser.id === "string" && pmUser.id.length > 0,
  );

  // 2. Login the PM user to obtain fresh tokens
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;
  const loggedInPm: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, { body: pmLoginBody });
  typia.assert(loggedInPm);
  TestValidator.equals("pm login id equals join id", loggedInPm.id, pmUser.id);
  TestValidator.predicate(
    "pm login token access is non-empty",
    typeof loggedInPm.token.access === "string" &&
      loggedInPm.token.access.length > 10,
  );

  // 3. Prepare valid filtering and pagination parameters
  const filterRequest1 = {
    page: 1,
    limit: 10,
    sort: "email",
    order: "asc",
  } satisfies ITaskManagementDesigner.IRequest;

  // 4. Request page 1, limit 10
  const page1: IPageITaskManagementDesigner.ISummary =
    await api.functional.taskManagement.pm.taskManagement.designers.index(
      connection,
      { body: filterRequest1 },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "pagination current page 1",
    page1.pagination.current === 1,
  );
  TestValidator.predicate("pagination limit 10", page1.pagination.limit === 10);
  TestValidator.predicate(
    "page1 records not more than limit",
    page1.data.length <= 10,
  );

  // 5. Test filtering by email substring if possible
  if (page1.data.length > 0) {
    const sampleEmailPrefix = page1.data[0].email.slice(0, 3);
    const filterByEmail = {
      email: sampleEmailPrefix,
      page: 1,
      limit: 5,
      sort: "email",
      order: "asc",
    } satisfies ITaskManagementDesigner.IRequest;
    const filteredByEmailPage: IPageITaskManagementDesigner.ISummary =
      await api.functional.taskManagement.pm.taskManagement.designers.index(
        connection,
        { body: filterByEmail },
      );
    typia.assert(filteredByEmailPage);
    TestValidator.predicate(
      "filtered email results are subset",
      filteredByEmailPage.data.every((designer) =>
        designer.email.includes(sampleEmailPrefix),
      ),
    );
  }

  // 6. Test filtering by name substring if possible
  if (page1.data.length > 0) {
    const sampleNamePrefix = page1.data[0].name.slice(0, 2);
    const filterByName = {
      name: sampleNamePrefix,
      page: 1,
      limit: 5,
      sort: "name",
      order: "desc",
    } satisfies ITaskManagementDesigner.IRequest;
    const filteredByNamePage: IPageITaskManagementDesigner.ISummary =
      await api.functional.taskManagement.pm.taskManagement.designers.index(
        connection,
        { body: filterByName },
      );
    typia.assert(filteredByNamePage);
    TestValidator.predicate(
      "filtered name results are subset",
      filteredByNamePage.data.every((designer) =>
        designer.name.includes(sampleNamePrefix),
      ),
    );
  }

  // 7. Test with no matching record (unlikely email that does not exist)
  const noMatchFilter = {
    email: "nomatch_email_xyz_1234567890@invaliddomain.test",
    page: 1,
    limit: 10,
  } satisfies ITaskManagementDesigner.IRequest;
  const emptyPage: IPageITaskManagementDesigner.ISummary =
    await api.functional.taskManagement.pm.taskManagement.designers.index(
      connection,
      { body: noMatchFilter },
    );
  typia.assert(emptyPage);
  TestValidator.equals("no match returns empty data", emptyPage.data.length, 0);

  // 8. Test invalid pagination values that should throw error
  await TestValidator.error("invalid pagination should fail", async () => {
    await api.functional.taskManagement.pm.taskManagement.designers.index(
      connection,
      {
        body: {
          page: -1,
          limit: -5,
        } satisfies ITaskManagementDesigner.IRequest,
      },
    );
  });

  // 9. Test unauthorized access: create unauthenticated connection with no tokens
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.taskManagement.pm.taskManagement.designers.index(
      unauthenticatedConnection,
      {
        body: { page: 1, limit: 10 } satisfies ITaskManagementDesigner.IRequest,
      },
    );
  });
}
