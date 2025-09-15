import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageISubscriptionRenewalGuardianVendor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISubscriptionRenewalGuardianVendor";
import type { ISubscriptionRenewalGuardianUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianUser";
import type { ISubscriptionRenewalGuardianVendor } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianVendor";

/**
 * This E2E test validates the /subscriptionRenewalGuardian/user/vendors
 * PATCH endpoint for authenticated user vendor search.
 *
 * It performs user registration to authenticate, then executes search
 * queries with filters and pagination. Validates pagination metadata,
 * vendor data shapes, and handles edge cases. Also tests unauthorized
 * access handling.
 *
 * Success criteria:
 *
 * - Returns paginated vendor summaries matching filters.
 * - Pagination metadata is coherent with data.
 * - Unauthorized requests fail with error.
 */
export async function test_api_subscription_renewal_guardian_user_vendors_index_basic_search(
  connection: api.IConnection,
) {
  // Authenticate the user to obtain authorization token
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
    password_hash: RandomGenerator.alphaNumeric(20),
  } satisfies ISubscriptionRenewalGuardianUser.ICreate;

  const authorizedUser: ISubscriptionRenewalGuardianUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // Prepare a valid search request with filters
  const searchRequest: ISubscriptionRenewalGuardianVendor.IRequest = {
    name: RandomGenerator.alphaNumeric(5),
    include_deleted: false,
    page: 1,
    limit: 5,
    sort_by: "name",
    sort_order: "asc",
  };

  // Make a search request with filters
  const vendorPage: IPageISubscriptionRenewalGuardianVendor.ISummary =
    await api.functional.subscriptionRenewalGuardian.user.vendors.index(
      connection,
      { body: searchRequest },
    );
  typia.assert(vendorPage);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page must be positive integer",
    vendorPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit must be positive integer",
    vendorPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages must be >= 0",
    vendorPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    vendorPage.pagination.records >= 0,
  );

  // Validate that the number of vendor summaries is lesser equal to limit
  TestValidator.predicate(
    "number of vendor data entries must be <= pagination limit",
    vendorPage.data.length <= vendorPage.pagination.limit,
  );

  // Additional check: pagination records should be >= length of data
  TestValidator.predicate(
    "pagination records should be >= returned data length",
    vendorPage.pagination.records >= vendorPage.data.length,
  );

  // Validate each vendor summary structure
  for (const vendor of vendorPage.data) {
    typia.assert(vendor);
    TestValidator.predicate(
      "vendor id is valid string",
      typeof vendor.id === "string" && vendor.id.length > 0,
    );
    TestValidator.predicate(
      "vendor name is valid string",
      typeof vendor.name === "string" && vendor.name.length > 0,
    );
    // Check created_at format using regex for ISO 8601
    TestValidator.predicate(
      "vendor created_at follows ISO 8601 date-time format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.\d+)?Z$/.test(
        vendor.created_at,
      ),
    );
  }

  // Test edge case: empty filters (explicit nulls passed for nullable fields)
  const emptyFilterRequest: ISubscriptionRenewalGuardianVendor.IRequest = {
    name: undefined, // optional, omitted
    include_deleted: null, // explicitly pass null to test default behavior
    page: 1,
    limit: 10,
    sort_by: undefined, // optional, omitted
    sort_order: null, // explicitly null
  };

  const firstPage: IPageISubscriptionRenewalGuardianVendor.ISummary =
    await api.functional.subscriptionRenewalGuardian.user.vendors.index(
      connection,
      {
        body: emptyFilterRequest,
      },
    );
  typia.assert(firstPage);

  // Verify pagination current is 1
  TestValidator.equals(
    "pagination current page equals 1",
    firstPage.pagination.current,
    1,
  );

  // If pages > 1, test last page
  if (firstPage.pagination.pages > 1) {
    const lastPageRequest = {
      ...emptyFilterRequest,
      page: firstPage.pagination.pages,
    } satisfies ISubscriptionRenewalGuardianVendor.IRequest;
    const lastPage: IPageISubscriptionRenewalGuardianVendor.ISummary =
      await api.functional.subscriptionRenewalGuardian.user.vendors.index(
        connection,
        {
          body: lastPageRequest,
        },
      );
    typia.assert(lastPage);

    TestValidator.equals(
      "pagination current page equals last page",
      lastPage.pagination.current,
      firstPage.pagination.pages,
    );
  }

  // Test unauthorized access: Use unauthenticated connection (empty headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.subscriptionRenewalGuardian.user.vendors.index(
      unauthenticatedConnection,
      { body: emptyFilterRequest },
    );
  });
}
