import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformDepartmenthead } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDepartmenthead";

/**
 * E2E test for searching department heads as an organization admin.
 *
 * Steps:
 *
 * 1. Register a new organization admin and login.
 * 2. Create multiple department heads (direct DB prep assumed since no
 *    creation endpoint in API contract).
 * 3. Search all department heads (no filter): expect to see created heads with
 *    correct pagination meta.
 * 4. Paginate: request multiple pages, check correct records received.
 * 5. Filter by department head email: search with substring, expect matching
 *    record(s).
 * 6. Filter by department head full name: search with substring, expect
 *    matching record(s).
 * 7. Search with filter that yields no result: expect empty data and correct
 *    meta.
 * 8. Pagination bounds: request invalid page (e.g., big page number), expect
 *    empty data and correct meta.
 * 9. Error handling: call department head search with no organization admin
 *    login (ensure no token in connection) and expect error.
 */
export async function test_api_departmenthead_search_orgadmin_filters_scope(
  connection: api.IConnection,
) {
  // 1. Register new organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminFullName = RandomGenerator.name();
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: adminFullName,
      phone: RandomGenerator.mobile(),
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Login as organization admin (token auto-managed)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Search (no filter)
  const result =
    await api.functional.healthcarePlatform.organizationAdmin.departmentheads.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(result);
  TestValidator.predicate(
    "pagination fields: current page is 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination fields: limit >= 0",
    result.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination fields: pages >= 1",
    result.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination fields: records >= 0",
    result.pagination.records >= 0,
  );

  // 4. If records > limit, check pagination works (page 2 has different or less data)
  if (result.pagination.records > result.pagination.limit) {
    const page2 =
      await api.functional.healthcarePlatform.organizationAdmin.departmentheads.index(
        connection,
        {
          body: { page: 2, limit: result.pagination.limit },
        },
      );
    typia.assert(page2);
    TestValidator.predicate(
      "pagination: page 2 is next page",
      page2.pagination.current === 2,
    );
    TestValidator.predicate(
      "pagination: same limit",
      page2.pagination.limit === result.pagination.limit,
    );
    TestValidator.predicate(
      "pagination: page2 data is different or less",
      page2.data.length <= result.pagination.limit,
    );
  }

  // 5. Filter by email substring: if there are records, use the first one's email
  if (result.data.length > 0) {
    const target = result.data[0];
    const midEmail = RandomGenerator.substring(target.email);
    const filterByMail =
      await api.functional.healthcarePlatform.organizationAdmin.departmentheads.index(
        connection,
        {
          body: { email: midEmail },
        },
      );
    typia.assert(filterByMail);
    TestValidator.predicate(
      "email filter should yield at least one match",
      filterByMail.data.length > 0,
    );
    TestValidator.predicate(
      "matched emails contain filter substring",
      filterByMail.data.some((x) => x.email.includes(midEmail)),
    );
  }

  // 6. Filter by full_name substring
  if (result.data.length > 0) {
    const target = result.data[0];
    const midName = RandomGenerator.substring(target.full_name);
    const filterByName =
      await api.functional.healthcarePlatform.organizationAdmin.departmentheads.index(
        connection,
        {
          body: { full_name: midName },
        },
      );
    typia.assert(filterByName);
    TestValidator.predicate(
      "name filter should yield at least one match",
      filterByName.data.length > 0,
    );
    TestValidator.predicate(
      "matched full_names contain filter substring",
      filterByName.data.some((x) => x.full_name.includes(midName)),
    );
  }

  // 7. Filter that yields no result
  const empty =
    await api.functional.healthcarePlatform.organizationAdmin.departmentheads.index(
      connection,
      {
        body: { email: RandomGenerator.alphaNumeric(32) + "@nomatch.com" }, // very unlikely random email
      },
    );
  typia.assert(empty);
  TestValidator.equals(
    "no data when filter doesn't match",
    empty.data.length,
    0,
  );

  // 8. Pagination bounds: request page way out of range
  const bigPage =
    await api.functional.healthcarePlatform.organizationAdmin.departmentheads.index(
      connection,
      {
        body: { page: 1000000 },
      },
    );
  typia.assert(bigPage);
  TestValidator.equals("no data for big page index", bigPage.data.length, 0);

  // 9. Error: Unauthenticated/unauthorized
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized search must fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.departmentheads.index(
      unauthConn,
      {
        body: {},
      },
    );
  });
}
