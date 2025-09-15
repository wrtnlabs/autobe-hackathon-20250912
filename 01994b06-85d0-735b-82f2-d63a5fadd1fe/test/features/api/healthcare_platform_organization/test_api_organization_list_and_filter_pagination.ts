import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformOrganization";

/**
 * Verify system admin can list, filter, and paginate organizations with diverse
 * filters.
 *
 * Steps:
 *
 * 1. Register a system admin and log in (email: random business domain).
 * 2. Ensure at least 2 organizations exist for test - with different names/status.
 *    If less than 2, create organization(s) with unique codes/names and random
 *    status.
 * 3. PATCH index with no filter: assert at least 2 results, page metadata
 *    (limit/page/total/pages).
 * 4. Filter by exact/partial name: call API with body { name } or { name: partial
 *    }.
 *
 *    - Validate returned organizations all match filter.
 * 5. Filter by status: issue PATCH with one of their statuses.
 * 6. Test pagination: set limit=1, request first and second page, validate the
 *    proper slicing and metadata.
 * 7. Test edge case - no match: give random code or name and expect empty
 *    result/data.
 * 8. Edge case: page N where N > pages, expect empty data.
 * 9. Try with unauthorized: clone connection, remove headers, expect error.
 * 10. Clean up: No org deletion endpoint, so skip clean-up.
 */
export async function test_api_organization_list_and_filter_pagination(
  connection: api.IConnection,
) {
  // 1. Register and log in as system admin
  const sysadminEmail = `${RandomGenerator.alphabets(6)}@example-corp.com`;
  const sysadminJoinBody = {
    email: sysadminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: sysadminEmail,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysadminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: sysadminJoinBody,
  });
  typia.assert(sysadminAuth);
  // headers are auto set

  // 2. Ensure at least 2 organizations exist
  const codes = [
    RandomGenerator.alphaNumeric(8),
    RandomGenerator.alphaNumeric(8),
  ];
  const names = [
    RandomGenerator.paragraph({ sentences: 3 }),
    RandomGenerator.paragraph({ sentences: 4 }),
  ];
  const statuses = ["active", "pending", "archived"] as const;
  // Create first organization
  const orgs: IHealthcarePlatformOrganization[] = [];
  const orgBody1 = {
    code: codes[0],
    name: names[0],
    status: RandomGenerator.pick(statuses),
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org1 =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgBody1 },
    );
  typia.assert(org1);
  orgs.push(org1);
  // Create second organization
  const orgBody2 = {
    code: codes[1],
    name: names[1],
    status: RandomGenerator.pick(statuses.filter((s) => s !== org1.status)),
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org2 =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgBody2 },
    );
  typia.assert(org2);
  orgs.push(org2);

  // 3. Get all/org index (no filter)
  const allPage =
    await api.functional.healthcarePlatform.systemAdmin.organizations.index(
      connection,
      { body: {} },
    );
  typia.assert(allPage);
  TestValidator.predicate(
    "page must include at least 2 orgs",
    allPage.data.length >= 2,
  );
  TestValidator.predicate("page metadata", !!allPage.pagination); // very basic

  // 4. Filter by exact name (org1)
  const pageByName =
    await api.functional.healthcarePlatform.systemAdmin.organizations.index(
      connection,
      { body: { name: org1.name } },
    );
  typia.assert(pageByName);
  TestValidator.predicate(
    "filter by exact name returns the intended org(s)",
    pageByName.data.every((row) => row.name === org1.name),
  );

  // 5. Filter by partial name
  const partial = org2.name.slice(0, Math.floor(org2.name.length / 2));
  const pageByPartial =
    await api.functional.healthcarePlatform.systemAdmin.organizations.index(
      connection,
      { body: { name: partial } },
    );
  typia.assert(pageByPartial);
  TestValidator.predicate(
    "all names include partial",
    pageByPartial.data.every((row) => row.name.includes(partial)),
  );

  // 6. Filter by status
  const pageByStatus =
    await api.functional.healthcarePlatform.systemAdmin.organizations.index(
      connection,
      { body: { status: org1.status } },
    );
  typia.assert(pageByStatus);
  TestValidator.predicate(
    "all results are desired status",
    pageByStatus.data.every((row) => row.status === org1.status),
  );

  // 7. Paginate with limit=1
  const page1 =
    await api.functional.healthcarePlatform.systemAdmin.organizations.index(
      connection,
      { body: { limit: 1 } },
    );
  typia.assert(page1);
  TestValidator.equals(
    "page1 length",
    page1.data.length,
    allPage.data.length === 0 ? 0 : 1,
  );
  // get second page
  const page2 =
    await api.functional.healthcarePlatform.systemAdmin.organizations.index(
      connection,
      { body: { limit: 1, page: 2 } },
    );
  typia.assert(page2);
  TestValidator.equals(
    "page2 length",
    page2.data.length,
    allPage.data.length >= 2 ? 1 : 0,
  );
  // check page metadata
  TestValidator.equals("pagination meta matches", page2.pagination.limit, 1);
  TestValidator.equals("pagination meta page==2", page2.pagination.current, 2);

  // 8. Edge: search no match
  const noMatch =
    await api.functional.healthcarePlatform.systemAdmin.organizations.index(
      connection,
      {
        body: { name: "NON_EXISTENT_NAME_" + RandomGenerator.alphaNumeric(6) },
      },
    );
  typia.assert(noMatch);
  TestValidator.equals("no result on strange name", noMatch.data.length, 0);

  // 9. Edge: page beyond last
  const lastPage = allPage.pagination.pages + 1;
  const pageBeyond =
    await api.functional.healthcarePlatform.systemAdmin.organizations.index(
      connection,
      { body: { page: lastPage } },
    );
  typia.assert(pageBeyond);
  TestValidator.equals("page beyond last", pageBeyond.data.length, 0);

  // 10. Unauthorized: detach headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized systemAdmin org listing fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.organizations.index(
        unauthConn,
        { body: {} },
      );
    },
  );
}
