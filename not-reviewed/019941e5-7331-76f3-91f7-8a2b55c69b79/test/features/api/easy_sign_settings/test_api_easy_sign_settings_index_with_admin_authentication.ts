import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEasySignAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignAdmin";
import type { IEasySignEasySignSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignEasySignSettings";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEasySignEasySignSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEasySignEasySignSettings";

/**
 * Test administrator authentication and system settings retrieval.
 *
 * This E2E test covers the full flow where an administrator creates an
 * account, authenticates to obtain JWT tokens, and then accesses the system
 * settings search and pagination endpoint.
 *
 * Steps:
 *
 * 1. Create and authenticate an administrator via POST /auth/admin/join.
 * 2. Use the returned token (managed by SDK) to access PATCH
 *    /easySign/admin/easySignSettings with search and pagination
 *    parameters.
 * 3. Validate response pagination data and setting items.
 * 4. Confirm unauthorized requests fail when no token is present.
 * 5. Validate input validation by sending invalid pagination values.
 *
 * This test ensures the admin endpoints enforce authentication and support
 * filtered, paginated retrieval of system settings with accurate response
 * types.
 *
 * @param connection Connection object to the API
 */
export async function test_api_easy_sign_settings_index_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(2),
  } satisfies IEasySignAdmin.ICreate;

  const admin: IEasySignAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // 2. Valid search and pagination request to index endpoint
  const searchRequest = {
    page: 1,
    limit: 10,
    setting_key: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    setting_value: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    notes: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
  } satisfies IEasySignEasySignSettings.IRequest;

  const pageResult: IPageIEasySignEasySignSettings.ISummary =
    await api.functional.easySign.admin.easySignSettings.index(connection, {
      body: searchRequest,
    });
  typia.assert(pageResult);

  // Validate pagination properties
  TestValidator.predicate(
    "pagination current page valid",
    typeof pageResult.pagination.current === "number" &&
      pageResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    typeof pageResult.pagination.limit === "number" &&
      pageResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    typeof pageResult.pagination.pages === "number" &&
      pageResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    typeof pageResult.pagination.records === "number" &&
      pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    Array.isArray(pageResult.data) &&
      pageResult.data.length <= pageResult.pagination.limit,
  );

  // Validate all data items have valid keys and IDs
  pageResult.data.forEach((item) => {
    TestValidator.predicate(
      "setting_key non-empty string",
      typeof item.setting_key === "string" && item.setting_key.length > 0,
    );
    TestValidator.predicate(
      "setting_value non-empty string",
      typeof item.setting_value === "string" && item.setting_value.length > 0,
    );
    TestValidator.predicate(
      "id is valid uuid",
      typeof item.id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          item.id,
        ),
    );
  });

  // 3. Unauthorized request (no authentication) to index endpoint should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized request fails", async () => {
    await api.functional.easySign.admin.easySignSettings.index(unauthConn, {
      body: searchRequest,
    });
  });

  // 4. Invalid pagination parameters should fail - limit negative
  const invalidPaginationRequest = {
    page: 1,
    limit: -1,
    setting_key: null,
    setting_value: null,
    notes: null,
  } satisfies IEasySignEasySignSettings.IRequest;

  await TestValidator.error(
    "invalid pagination parameter rejects",
    async () => {
      await api.functional.easySign.admin.easySignSettings.index(connection, {
        body: invalidPaginationRequest,
      });
    },
  );
}
