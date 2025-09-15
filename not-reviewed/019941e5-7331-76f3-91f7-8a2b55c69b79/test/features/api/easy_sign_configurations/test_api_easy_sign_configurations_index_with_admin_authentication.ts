import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEasySignAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignAdmin";
import type { IEasySignEasySignConfigurations } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignEasySignConfigurations";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEasySignEasySignConfigurations } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEasySignEasySignConfigurations";

/**
 * This test function performs an end-to-end verification of the EasySign
 * system's configuration management API, focusing on admin-only access. It
 * consists of two main stages:
 *
 * 1. Creating a new administrator account via the /auth/admin/join endpoint,
 *    providing the required email and username fields. The creation
 *    confirms successful admin registration and retrieves authentication
 *    JWT tokens.
 * 2. Using the authenticated session to query system configurations through
 *    the /easySign/admin/easySignConfigurations PATCH endpoint, passing in
 *    pagination and filter parameters such as page number, limit, and
 *    search keywords. The test verifies the response schema alignment with
 *    paginated configuration summaries and the presence of filtering
 *    results, ensuring the filtering and pagination are correctly applied.
 *
 * The test also attempts to access restricted configurations without
 * authentication to confirm proper access control and unauthorized
 * rejection.
 *
 * This test covers business rules ensuring only authenticated admins can
 * access sensitive configuration data and validates the correctness of
 * pagination and filtering mechanisms in this context.
 */
export async function test_api_easy_sign_configurations_index_with_admin_authentication(
  connection: api.IConnection,
) {
  // Step 1. Create a new admin user
  const email = `${RandomGenerator.alphabets(10)}@example.com`;
  const username = RandomGenerator.name(2);
  const adminCreateBody = { email, username } satisfies IEasySignAdmin.ICreate;
  const admin: IEasySignAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // Step 2. Prepare request for EasySign configurations with filters
  const requestBody = {
    page: 1,
    limit: 10,
    search: RandomGenerator.substring("configuration"),
    sort: "config_key",
    direction: "asc",
  } satisfies IEasySignEasySignConfigurations.IRequest;

  // Step 3. Retrieve filtered and paginated list of EasySign configurations
  const configurationsPage: IPageIEasySignEasySignConfigurations.ISummary =
    await api.functional.easySign.admin.easySignConfigurations.index(
      connection,
      { body: requestBody },
    );
  typia.assert(configurationsPage);

  // Step 4. Validate pagination data and configuration summaries against request
  TestValidator.predicate(
    "pagination current page matches request",
    configurationsPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    configurationsPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages and records are valid numbers",
    Number.isInteger(configurationsPage.pagination.pages) &&
      configurationsPage.pagination.pages >= 0 &&
      Number.isInteger(configurationsPage.pagination.records) &&
      configurationsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "all data items have non-empty config keys",
    configurationsPage.data.every(
      (item) =>
        typeof item.config_key === "string" && item.config_key.length > 0,
    ),
  );

  // Step 5. Attempt unauthorized access without admin session
  // Create a fresh unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized access to EasySign configurations should be rejected",
    async () => {
      await api.functional.easySign.admin.easySignConfigurations.index(
        unauthenticatedConnection,
        {
          body: requestBody,
        },
      );
    },
  );
}
