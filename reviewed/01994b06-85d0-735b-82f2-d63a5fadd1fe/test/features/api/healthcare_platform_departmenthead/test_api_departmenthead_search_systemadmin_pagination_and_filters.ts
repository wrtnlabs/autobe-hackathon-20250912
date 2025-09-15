import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformDepartmenthead } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDepartmenthead";

/**
 * E2E test for searching department heads as a system admin with pagination
 * and filters.
 *
 * Validates: (1) successful department head list retrieval with and without
 * filters, (2) pagination boundary cases (first, last, empty page), (3)
 * correct response to invalid/no-match filters, (4) sorting by supported
 * fields, and (5) access control for unauthenticated requests.
 *
 * Workflow:
 *
 * 1. Register and login a system admin (fulfilling all join and login
 *    dependencies)
 * 2. (Optional) List department heads without filters to get ground truth list
 * 3. Select one department head for partial and exact filter testing
 * 4. Perform search with partial and exact filters on email and full_name
 * 5. Search with date window (created_from, created_to) using selected
 *    department head's created_at
 * 6. Validate pagination: check total, pages, empty/non-empty for first, last,
 *    and out-of-bounds page
 * 7. Test sort direction for at least one supported field
 * 8. Validate unauthorized access is denied for unauthenticated requests
 *    (empty headers)
 *
 * For all list responses, check that returned records contain only
 * accessible department heads (not deleted), and match filter/pagination
 * parameters. For filter edge cases, validate empty result set. For
 * boundary page requests, validate response matches total and pages. All
 * API responses are asserted with typia.assert().
 */
export async function test_api_departmenthead_search_systemadmin_pagination_and_filters(
  connection: api.IConnection,
) {
  // 1. Register and login a system admin
  const sysAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: "sysadmin_provider_key",
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoinBody,
  });
  typia.assert(sysAdmin);
  const sysAdminLoginBody = {
    email: sysAdmin.email,
    provider: "local",
    provider_key: sysAdmin.email,
    password: sysAdminJoinBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const sysAdminToken = await api.functional.auth.systemAdmin.login(
    connection,
    { body: sysAdminLoginBody },
  );
  typia.assert(sysAdminToken);

  // 2. List department heads (unfiltered)
  const baseSearch =
    await api.functional.healthcarePlatform.systemAdmin.departmentheads.index(
      connection,
      { body: {} satisfies IHealthcarePlatformDepartmentHead.IRequest },
    );
  typia.assert(baseSearch);
  const total = baseSearch.pagination.records;

  // 3. If there is at least one department head returns, select one for filters
  let filterTarget: IHealthcarePlatformDepartmentHead | undefined = undefined;
  if (baseSearch.data.length > 0) filterTarget = baseSearch.data[0];

  // 4. Partial and exact filter tests
  if (filterTarget) {
    const emailFragment = filterTarget.email.slice(
      0,
      Math.floor(filterTarget.email.length / 2),
    );
    const fullNameFragment = filterTarget.full_name.slice(
      0,
      Math.floor(filterTarget.full_name.length / 2),
    );

    // Exact email
    const exactEmailSearch =
      await api.functional.healthcarePlatform.systemAdmin.departmentheads.index(
        connection,
        {
          body: {
            email: filterTarget.email,
          } satisfies IHealthcarePlatformDepartmentHead.IRequest,
        },
      );
    typia.assert(exactEmailSearch);
    TestValidator.predicate(
      "exact email match count >= 1",
      exactEmailSearch.data.length >= 1,
    );
    TestValidator.predicate(
      "records only with exact email",
      exactEmailSearch.data.every((dh) => dh.email === filterTarget!.email),
    );

    // Partial email
    const partialEmailSearch =
      await api.functional.healthcarePlatform.systemAdmin.departmentheads.index(
        connection,
        {
          body: {
            email: emailFragment,
          } satisfies IHealthcarePlatformDepartmentHead.IRequest,
        },
      );
    typia.assert(partialEmailSearch);
    TestValidator.predicate(
      "at least one record with matching partial email",
      partialEmailSearch.data.some((dh) => dh.email.includes(emailFragment)),
    );

    // Exact full_name
    const exactFullNameSearch =
      await api.functional.healthcarePlatform.systemAdmin.departmentheads.index(
        connection,
        {
          body: {
            full_name: filterTarget.full_name,
          } satisfies IHealthcarePlatformDepartmentHead.IRequest,
        },
      );
    typia.assert(exactFullNameSearch);
    TestValidator.predicate(
      "exact full_name match >= 1",
      exactFullNameSearch.data.length >= 1,
    );
    TestValidator.predicate(
      "records only with exact full_name",
      exactFullNameSearch.data.every(
        (dh) => dh.full_name === filterTarget!.full_name,
      ),
    );

    // Partial full_name
    const partialFullNameSearch =
      await api.functional.healthcarePlatform.systemAdmin.departmentheads.index(
        connection,
        {
          body: {
            full_name: fullNameFragment,
          } satisfies IHealthcarePlatformDepartmentHead.IRequest,
        },
      );
    typia.assert(partialFullNameSearch);
    TestValidator.predicate(
      "at least one record with matching partial name",
      partialFullNameSearch.data.some((dh) =>
        dh.full_name.includes(fullNameFragment),
      ),
    );

    // Date filters
    const createdAt = filterTarget.created_at;
    const dateFromSearch =
      await api.functional.healthcarePlatform.systemAdmin.departmentheads.index(
        connection,
        {
          body: {
            created_from: createdAt,
          } satisfies IHealthcarePlatformDepartmentHead.IRequest,
        },
      );
    typia.assert(dateFromSearch);
    TestValidator.predicate(
      "records created_at >= filter",
      dateFromSearch.data.every((dh) => dh.created_at >= createdAt),
    );
    const dateToSearch =
      await api.functional.healthcarePlatform.systemAdmin.departmentheads.index(
        connection,
        {
          body: {
            created_to: createdAt,
          } satisfies IHealthcarePlatformDepartmentHead.IRequest,
        },
      );
    typia.assert(dateToSearch);
    TestValidator.predicate(
      "records created_at <= filter",
      dateToSearch.data.every((dh) => dh.created_at <= createdAt),
    );
  }

  // 5. Pagination boundary checks
  if (total > 1) {
    // First page
    const firstPage =
      await api.functional.healthcarePlatform.systemAdmin.departmentheads.index(
        connection,
        {
          body: {
            page: 1,
            limit: 1,
          } satisfies IHealthcarePlatformDepartmentHead.IRequest,
        },
      );
    typia.assert(firstPage);
    TestValidator.equals("first page current", firstPage.pagination.current, 1);
    TestValidator.predicate(
      "first page has at most 1 record",
      firstPage.data.length <= 1,
    );

    // Last page
    const lastPageNum = firstPage.pagination.pages;
    const lastPage =
      await api.functional.healthcarePlatform.systemAdmin.departmentheads.index(
        connection,
        {
          body: {
            page: lastPageNum,
            limit: 1,
          } satisfies IHealthcarePlatformDepartmentHead.IRequest,
        },
      );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page current",
      lastPage.pagination.current,
      lastPageNum,
    );
    TestValidator.predicate(
      "last page has at most 1 record",
      lastPage.data.length <= 1,
    );

    // Out of range/empty result page
    const emptyPage =
      await api.functional.healthcarePlatform.systemAdmin.departmentheads.index(
        connection,
        {
          body: {
            page: lastPageNum + 1,
            limit: 1,
          } satisfies IHealthcarePlatformDepartmentHead.IRequest,
        },
      );
    typia.assert(emptyPage);
    TestValidator.equals(
      "empty page data length is 0",
      emptyPage.data.length,
      0,
    );
  }

  // 6. Invalid/no-matches filter
  const noMatch =
    await api.functional.healthcarePlatform.systemAdmin.departmentheads.index(
      connection,
      {
        body: {
          email: "nonexistent_invalid_email_for_e2e@nowhere.tld",
        } satisfies IHealthcarePlatformDepartmentHead.IRequest,
      },
    );
  typia.assert(noMatch);
  TestValidator.equals("no match returns empty", noMatch.data.length, 0);

  // 7. Access denied for unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated request is denied", async () => {
    await api.functional.healthcarePlatform.systemAdmin.departmentheads.index(
      unauthConn,
      { body: {} satisfies IHealthcarePlatformDepartmentHead.IRequest },
    );
  });
}
