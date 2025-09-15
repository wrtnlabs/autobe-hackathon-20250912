import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformConfiguration";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformConfiguration";

/**
 * Validates system administrator's ability to search and filter configuration
 * records. Ensures authentication, data boundaries, advanced filtering,
 * pagination, and edge cases.
 *
 * 1. Register and login as a system admin (local provider).
 * 2. Create two organizations (org1, org2).
 * 3. Create configuration records scoped to org1, org2, and as global (null org).
 * 4. Search with no filter: expects all active configs; verifies pagination and
 *    structure.
 * 5. Search filtered by organization_id: ensures only that org's configs are
 *    returned.
 * 6. Filter by key for a known config: validates only matching configs are
 *    returned.
 * 7. Filter by value as substring: checks at least one config matches.
 * 8. Pagination edge test: limit=1, page=2; verifies correct item count and page.
 * 9. Search with deleted=true (should yield zero unless there are deleted
 *    records).
 * 10. Invalid organization id: shows no results, no data leak.
 * 11. Invalid key: no results.
 * 12. Attempt search with unauthenticated connection: expects error.
 */
export async function test_api_system_admin_configuration_search_and_filter(
  connection: api.IConnection,
) {
  // 1. System admin registration & login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const joinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: adminPassword,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // explicit login for fresh auth token
  const loginBody = {
    email: adminEmail,
    provider: "local",
    provider_key: adminEmail,
    password: adminPassword,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loginOut = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(loginOut);

  // 2. Create organizations
  const orgBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgBody },
    );
  typia.assert(org);

  const org2Body = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org2 =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: org2Body },
    );
  typia.assert(org2);

  // 3. Create configurations (some global, some org-specific)
  const configs: IHealthcarePlatformConfiguration[] = [];
  for (const [ix, organization_id] of [org.id, org2.id, null].entries()) {
    for (let j = 0; j < 2; ++j) {
      const body = {
        healthcare_platform_organization_id: organization_id ?? undefined,
        key: `test_key_${ix}_${j}_${RandomGenerator.alphaNumeric(5)}`,
        value: `test_value_${ix}_${j}_${RandomGenerator.alphaNumeric(5)}`,
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IHealthcarePlatformConfiguration.ICreate;
      const result =
        await api.functional.healthcarePlatform.systemAdmin.configuration.create(
          connection,
          { body },
        );
      typia.assert(result);
      configs.push(result);
    }
  }
  // 4. Search: all configs, no filter (should show all active records)
  let out =
    await api.functional.healthcarePlatform.systemAdmin.configuration.index(
      connection,
      { body: {} },
    );
  typia.assert(out);
  TestValidator.predicate(
    "all configs fetched",
    out.data.length >= configs.length,
  );
  for (const row of out.data)
    typia.assert<IHealthcarePlatformConfiguration>(row);

  // 5. Filter by organization_id: Only that org's configs should be returned
  out = await api.functional.healthcarePlatform.systemAdmin.configuration.index(
    connection,
    { body: { organization_id: org.id } },
  );
  typia.assert(out);
  for (const row of out.data)
    TestValidator.equals(
      "org data matches filter (org1)",
      row.healthcare_platform_organization_id,
      org.id,
    );

  // 6. Filter by key (for one of the created keys)
  const sampleConfig = configs[0];
  out = await api.functional.healthcarePlatform.systemAdmin.configuration.index(
    connection,
    { body: { key: sampleConfig.key } },
  );
  typia.assert(out);
  for (const row of out.data)
    TestValidator.equals(
      "key filter result matches",
      row.key,
      sampleConfig.key,
    );

  // 7. Filter by value (partial search)
  const valuePart = sampleConfig.value.slice(0, 10);
  out = await api.functional.healthcarePlatform.systemAdmin.configuration.index(
    connection,
    { body: { value: valuePart } },
  );
  typia.assert(out);
  TestValidator.predicate(
    "at least one config contains search substring",
    out.data.some((c) => c.value.includes(valuePart)),
  );
  for (const row of out.data)
    TestValidator.predicate(
      "row value includes substring",
      row.value.includes(valuePart),
    );

  // 8. Pagination boundary: limit=1, page=2
  out = await api.functional.healthcarePlatform.systemAdmin.configuration.index(
    connection,
    {
      body: {
        limit: 1 as number & tags.Type<"int32">,
        page: 2 as number & tags.Type<"int32">,
      },
    },
  );
  typia.assert(out);
  TestValidator.equals("paginated page size is 1", out.data.length, 1);
  TestValidator.equals("correct page number", out.pagination.current, 2);

  // 9. Filter only deleted=true: should yield zero since we have none deleted
  out = await api.functional.healthcarePlatform.systemAdmin.configuration.index(
    connection,
    { body: { deleted: true } },
  );
  typia.assert(out);
  TestValidator.equals("no deleted configs found", out.data.length, 0);

  // 10. Invalid org id filter: should get 0 results
  out = await api.functional.healthcarePlatform.systemAdmin.configuration.index(
    connection,
    {
      body: { organization_id: typia.random<string & tags.Format<"uuid">>() },
    },
  );
  typia.assert(out);
  TestValidator.equals(
    "nonexistent org returns zero results",
    out.data.length,
    0,
  );

  // 11. Invalid key filter: should get 0 results
  out = await api.functional.healthcarePlatform.systemAdmin.configuration.index(
    connection,
    { body: { key: RandomGenerator.alphaNumeric(16) } },
  );
  typia.assert(out);
  TestValidator.equals("random key returns zero results", out.data.length, 0);

  // 12. Unauthenticated access: test with fresh connection (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated search denied", async () => {
    await api.functional.healthcarePlatform.systemAdmin.configuration.index(
      unauthConn,
      { body: {} },
    );
  });
}
