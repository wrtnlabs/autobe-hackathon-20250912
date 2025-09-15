import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIStoryfieldAiEnvSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiEnvSetting";
import type { IStoryfieldAiEnvSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiEnvSetting";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Test the ability for a system administrator to search/filter/paginate
 * environment settings (envSettings) via PATCH
 * /storyfieldAi/systemAdmin/envSettings.
 *
 * 1. Register and log in as a new system administrator
 * 2. Create several environment setting records, with unique env_key and
 *    varied env_name fields, all linked to the logged-in admin
 * 3. Perform paginated and filtered search using env_name, env_key, and
 *    changed_by. Confirm results only contain matching records, and
 *    pagination info is accurate.
 * 4. Test excessive/invalid page and limit values (e.g., high limits,
 *    out-of-range pages), and search without filters (should return all or
 *    default page size)
 * 5. Confirm unauthorized access is rejected by performing a search after
 *    clearing admin authentication (simulate non-admin session)
 */
export async function test_api_env_settings_search_and_pagination_by_admin(
  connection: api.IConnection,
) {
  // 1. System admin registration and authentication
  const sysAdminJoin = {
    external_admin_id: RandomGenerator.alphaNumeric(10),
    email: `admin_${RandomGenerator.alphaNumeric(8)}@company.com`,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoin,
  });
  typia.assert(admin);

  // 2. Create several environment setting records (with varying env_key/env_name/changed_by)
  const ENV_NAMES = ["development", "staging", "production", "local"] as const;
  const settings = await ArrayUtil.asyncRepeat(12, async (idx) => {
    const envSetting = {
      env_key: `KEY_${RandomGenerator.alphaNumeric(6)}`,
      env_value: RandomGenerator.alphaNumeric(32),
      env_name: RandomGenerator.pick(ENV_NAMES),
      changed_by: admin.email,
      change_reason: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IStoryfieldAiEnvSetting.ICreate;
    const created =
      await api.functional.storyfieldAi.systemAdmin.envSettings.create(
        connection,
        {
          body: envSetting,
        },
      );
    typia.assert(created);
    return created;
  });

  // 3. Paginated search by filter (env_name)
  const chosenEnvName = RandomGenerator.pick(ENV_NAMES);
  const filterByEnvName = {
    env_name: chosenEnvName,
    page: 1,
    limit: 5,
  } satisfies IStoryfieldAiEnvSetting.IRequest;
  const pageResult =
    await api.functional.storyfieldAi.systemAdmin.envSettings.index(
      connection,
      { body: filterByEnvName },
    );
  typia.assert(pageResult);
  TestValidator.predicate(
    "paginated env_settings filtered by env_name are correct",
    pageResult.data.every((setting) => setting.env_name === chosenEnvName),
  );
  TestValidator.equals(
    "pagination limit matches request",
    pageResult.pagination.limit,
    5,
  );

  // 4. Filter by env_key (one from created data)
  const pickedKey = RandomGenerator.pick(settings).env_key;
  const filterByKey = {
    env_key: pickedKey,
  } satisfies IStoryfieldAiEnvSetting.IRequest;
  const pageEnvKey =
    await api.functional.storyfieldAi.systemAdmin.envSettings.index(
      connection,
      { body: filterByKey },
    );
  typia.assert(pageEnvKey);
  TestValidator.predicate(
    "search result only contains env_key-matched records",
    pageEnvKey.data.every((setting) => setting.env_key === pickedKey),
  );
  TestValidator.predicate(
    "at least one record returned for env_key filter",
    pageEnvKey.data.length > 0,
  );

  // 5. Search by changed_by (admin email)
  const pageChangedBy =
    await api.functional.storyfieldAi.systemAdmin.envSettings.index(
      connection,
      {
        body: {
          changed_by: admin.email,
        } satisfies IStoryfieldAiEnvSetting.IRequest,
      },
    );
  typia.assert(pageChangedBy);
  TestValidator.predicate(
    "all records changed_by match admin email",
    pageChangedBy.data.every((s) => s.changed_by === admin.email),
  );

  // 6. High limit value (pagination + no filters)
  const highLimit = 20;
  const pageAll =
    await api.functional.storyfieldAi.systemAdmin.envSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: highLimit,
        } satisfies IStoryfieldAiEnvSetting.IRequest,
      },
    );
  typia.assert(pageAll);
  TestValidator.equals(
    "pagination limit for high limit",
    pageAll.pagination.limit,
    highLimit,
  );

  // 7. Missing filters (should return results, default page size)
  const pageNoFilter =
    await api.functional.storyfieldAi.systemAdmin.envSettings.index(
      connection,
      {
        body: {} satisfies IStoryfieldAiEnvSetting.IRequest,
      },
    );
  typia.assert(pageNoFilter);
  TestValidator.predicate(
    "paginated records returned with no filters",
    Array.isArray(pageNoFilter.data) && pageNoFilter.data.length > 0,
  );

  // 8. Boundary page values (excessively high page number)
  const boundaryPage =
    await api.functional.storyfieldAi.systemAdmin.envSettings.index(
      connection,
      {
        body: {
          page: 1000,
          limit: 5,
        } satisfies IStoryfieldAiEnvSetting.IRequest,
      },
    );
  typia.assert(boundaryPage);
  TestValidator.equals(
    "zero records if page too high",
    boundaryPage.data.length,
    0,
  );

  // 9. Unauthorized access (simulate non-admin)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access by non-systemAdmin should fail",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.envSettings.index(
        unauthConn,
        {
          body: {
            env_name: chosenEnvName,
            page: 1,
            limit: 3,
          } satisfies IStoryfieldAiEnvSetting.IRequest,
        },
      );
    },
  );
}
