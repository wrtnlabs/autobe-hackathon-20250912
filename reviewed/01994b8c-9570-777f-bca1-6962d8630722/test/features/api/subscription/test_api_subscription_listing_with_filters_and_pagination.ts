import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageISubscriptionRenewalGuardianSubscriptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISubscriptionRenewalGuardianSubscriptions";
import type { ISubscriptionRenewalGuardianSubscriptions } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianSubscriptions";
import type { ISubscriptionRenewalGuardianUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianUser";
import type { ISubscriptionRenewalGuardianVendor } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianVendor";

/**
 * Test to verify the listing of user subscriptions with filters and
 * pagination support.
 *
 * This test covers the end-to-end flow:
 *
 * - User registration and authentication
 * - Vendor creation
 * - Subscription creation linked to different vendors
 * - Retrieve filtered and paginated subscriptions
 * - Validate filter and pagination correctness
 *
 * Verifies that users only see their own subscriptions and that filters
 * correctly limit results returned.
 */
export async function test_api_subscription_listing_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const userCreate = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ISubscriptionRenewalGuardianUser.ICreate;
  const user: ISubscriptionRenewalGuardianUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userCreate });
  typia.assert(user);

  // 2. Create vendors
  const vendorNames = ["Netflix", "Spotify", "Hulu"] as const;
  const vendors: ISubscriptionRenewalGuardianVendor[] = [];
  for (const name of vendorNames) {
    const vendorCreate = {
      name,
    } satisfies ISubscriptionRenewalGuardianVendor.ICreate;
    const vendor =
      await api.functional.subscriptionRenewalGuardian.user.vendors.create(
        connection,
        { body: vendorCreate },
      );
    typia.assert(vendor);
    vendors.push(vendor);
  }

  // 3. Create subscriptions with varying vendors and statuses
  const statuses = ["ACTIVE", "PAUSED", "CANCELED"] as const;
  const subscriptions: {
    subscription: ISubscriptionRenewalGuardianSubscriptions;
  }[] = [];
  const nowISO = new Date().toISOString();

  for (let i = 0; i < 9; ++i) {
    const vendor = vendors[i % vendors.length];
    const status = statuses[i % statuses.length];
    const subscriptionCreate = {
      vendor_id: vendor.id,
      plan_name: `Plan ${i + 1}`,
      billing_cycle: typia.random<"DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY">(),
      amount: (i + 1) * 10,
      currency: "USD",
      started_at: nowISO,
      status: status,
      notes: `Notes for subscription ${i + 1}`,
    } satisfies ISubscriptionRenewalGuardianSubscriptions.ICreate;

    const subscription =
      await api.functional.subscriptionRenewalGuardian.user.subscriptions.create(
        connection,
        { body: subscriptionCreate },
      );
    typia.assert(subscription);
    subscriptions.push({ subscription });
  }

  // 4. Fetch subscriptions filtered by vendor_id
  for (const vendor of vendors) {
    const filterReq = {
      vendor_id: vendor.id,
    } satisfies ISubscriptionRenewalGuardianSubscriptions.IRequest;
    const page =
      await api.functional.subscriptionRenewalGuardian.user.subscriptions.index(
        connection,
        { body: filterReq },
      );

    typia.assert(page);

    // Validate all subscriptions returned are for vendor's id based on created records
    const subsForVendor = subscriptions.filter(
      ({ subscription }) => subscription.vendor_id === vendor.id,
    );

    TestValidator.equals(
      `Subscriptions count for vendor ${vendor.name}`,
      page.pagination.records,
      subsForVendor.length,
    );

    TestValidator.predicate(
      `All fetched subscriptions have plan names in created list for vendor ${vendor.name}`,
      page.data.every((sub) =>
        subsForVendor.some(
          ({ subscription }) => subscription.plan_name === sub.plan_name,
        ),
      ),
    );

    // Validate pagination metadata
    TestValidator.predicate(
      `Pagination limit positive for vendor ${vendor.name}`,
      page.pagination.limit > 0,
    );
  }

  // 5. Fetch subscriptions filtered by status = ACTIVE
  const activeFilter = {
    status: "ACTIVE",
  } satisfies ISubscriptionRenewalGuardianSubscriptions.IRequest;
  const activePage =
    await api.functional.subscriptionRenewalGuardian.user.subscriptions.index(
      connection,
      { body: activeFilter },
    );
  typia.assert(activePage);

  const subsWithActiveStatus = subscriptions.filter(
    ({ subscription }) => subscription.status === "ACTIVE",
  );

  TestValidator.equals(
    "Subscriptions count with ACTIVE status",
    activePage.pagination.records,
    subsWithActiveStatus.length,
  );

  TestValidator.predicate(
    "All fetched subscriptions have ACTIVE status",
    activePage.data.every((sub) => sub.status === "ACTIVE"),
  );

  // 6. Test pagination parameters: limit = 3, page = 1
  const paginationReq = {
    limit: 3,
    page: 1,
  } satisfies ISubscriptionRenewalGuardianSubscriptions.IRequest;
  const pagedResult =
    await api.functional.subscriptionRenewalGuardian.user.subscriptions.index(
      connection,
      { body: paginationReq },
    );
  typia.assert(pagedResult);

  TestValidator.predicate(
    "Paged result data does not exceed limit",
    pagedResult.data.length <= 3,
  );
  TestValidator.equals(
    "Paging current page equals request page",
    pagedResult.pagination.current,
    1,
  );

  // 7. Test pagination page = 2 with limit = 3
  const paginationReq2 = {
    limit: 3,
    page: 2,
  } satisfies ISubscriptionRenewalGuardianSubscriptions.IRequest;
  const pagedResult2 =
    await api.functional.subscriptionRenewalGuardian.user.subscriptions.index(
      connection,
      { body: paginationReq2 },
    );
  typia.assert(pagedResult2);

  TestValidator.predicate(
    "Paged result2 data does not exceed limit",
    pagedResult2.data.length <= 3,
  );
  TestValidator.equals(
    "Paging current page equals request page 2",
    pagedResult2.pagination.current,
    2,
  );
}
