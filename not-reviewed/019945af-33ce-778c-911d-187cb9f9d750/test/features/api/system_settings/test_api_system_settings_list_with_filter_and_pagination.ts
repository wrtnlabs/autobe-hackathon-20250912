import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeSystemSettings";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeSystemSettings";

/**
 * Validate the listing of system settings for admin with filters and
 * pagination.
 *
 * This test covers:
 *
 * 1. Creation and login of an admin user to obtain authentication tokens.
 * 2. Listing system settings with filtering by key substring, pagination
 *    (page, limit), and key order.
 * 3. Validation of pagination metadata and filtered records returned.
 * 4. Edge cases including empty results and default pagination behavior.
 * 5. Unauthorized access failure and invalid filter format inputs resulting in
 *    HTTP 401 and 400 errors respectively.
 */
export async function test_api_system_settings_list_with_filter_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;
  const adminAuth: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // 2. Admin login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;
  const adminLoginAuth: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoginAuth);

  // 3. Prepare filter request for system settings listing
  const filterKey = RandomGenerator.alphabets(3); // substring filter for config keys
  const page = 1;
  const limit = 10;
  const orderByKey = "asc" as const;
  const requestBody = {
    key: filterKey,
    page: page,
    limit: limit,
    order_by_key: orderByKey,
    created_at_min: null,
    created_at_max: null,
  } satisfies IFlexOfficeSystemSettings.IRequest;

  // 4. Call system settings index endpoint as authorized admin
  const response: IPageIFlexOfficeSystemSettings.ISummary =
    await api.functional.flexOffice.admin.systemSettings.index(connection, {
      body: requestBody,
    });
  typia.assert(response);

  const { pagination, data } = response;

  // 5. Validate pagination object structure
  TestValidator.predicate(
    "pagination current is at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );

  // If no data, data array length should be zero
  if (data.length === 0) {
    TestValidator.equals("empty data with zero records", pagination.records, 0);
  } else {
    // For non-empty data, each record's key should contain the filter substring
    for (const setting of data) {
      TestValidator.predicate(
        `setting key contains filter substring: '${filterKey}'`,
        setting.key.includes(filterKey),
      );
      typia.assert(setting);
    }
  }

  // 6. Edge case: Call without filters - default pagination behavior
  const defaultResponse: IPageIFlexOfficeSystemSettings.ISummary =
    await api.functional.flexOffice.admin.systemSettings.index(connection, {
      body: {
        created_at_min: null,
        created_at_max: null,
        key: undefined,
        limit: undefined,
        order_by_key: undefined,
        page: undefined,
      },
    });
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default pagination current >= 1",
    defaultResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default pagination limit >= 1",
    defaultResponse.pagination.limit >= 1,
  );

  // 7. Failure case: unauthorized access (simulate by clearing authorization headers)
  const unauthorizedConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "401 unauthorized on system settings list",
    async () => {
      await api.functional.flexOffice.admin.systemSettings.index(
        unauthorizedConnection,
        {
          body: requestBody,
        },
      );
    },
  );

  // 8. Failure case: invalid filter format (created_at_min with invalid date string)
  const invalidFilter = {
    ...requestBody,
    created_at_min: "invalid-date-string",
  } satisfies IFlexOfficeSystemSettings.IRequest;
  await TestValidator.error(
    "400 bad request on invalid date filter",
    async () => {
      await api.functional.flexOffice.admin.systemSettings.index(connection, {
        body: invalidFilter,
      });
    },
  );
}
