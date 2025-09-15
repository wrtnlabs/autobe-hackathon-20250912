import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentMethod";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformBillingPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingPaymentMethod";

/**
 * Validates advanced filtering, sorting, and pagination for listing billing
 * payment methods.
 *
 * 1. Registers new org admin and authenticates.
 * 2. Creates 4 payment methods for that org (with differing
 *    method_type/provider_name/is_active).
 * 3. Filter by organization_id; checks all methods are present and match org.
 * 4. Filter by method_type; checks all returned items match.
 * 5. Filter by provider_name; checks all returned items match.
 * 6. Filter by is_active; checks that only enabled/disabled methods are returned.
 * 7. Sorts by method_type (asc) and provider_name (desc) and checks order.
 * 8. Paginates (page_size=2, two pages) and checks lengths/pages.
 * 9. Negative test: invalid method_type triggers error.
 */
export async function test_api_billing_payment_methods_filter_sort_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin & authenticate
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "TestPassword123!",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: joinBody },
  );
  typia.assert(orgAdmin);
  // 2. Login as org admin
  const login = await api.functional.auth.organizationAdmin.login(connection, {
    body: { email: joinBody.email, password: joinBody.password },
  });
  typia.assert(login);
  // 3. Create payment methods (mix values)
  const methodTypes = ["credit_card", "ach", "cash", "insurance"] as const;
  const providerNames = ["Visa", "Stripe", "In-house", "Aetna"] as const;
  const isActiveOptions = [true, false] as const;
  const created = await ArrayUtil.asyncMap([0, 1, 2, 3], async (i) => {
    const payment =
      await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.create(
        connection,
        {
          body: {
            organization_id: orgAdmin.id,
            method_type: methodTypes[i],
            provider_name: providerNames[i],
            is_active: isActiveOptions[i % 2],
            details_json: JSON.stringify({
              desc: RandomGenerator.paragraph({ sentences: 3 }),
            }),
          },
        },
      );
    typia.assert(payment);
    return payment;
  });
  // 4. Filter by organization_id - should get all 4
  {
    const result =
      await api.functional.healthcarePlatform.billingPaymentMethods.index(
        connection,
        {
          body: { organization_id: orgAdmin.id },
        },
      );
    typia.assert(result);
    TestValidator.equals(
      "all payment methods returned for organization_id filter",
      result.data.length,
      created.length,
    );
    for (const method of result.data) {
      TestValidator.equals(
        "payment org_id matches",
        method.organization_id,
        orgAdmin.id,
      );
    }
  }
  // 5. Filter by method_type
  for (const [idx, methodType] of methodTypes.entries()) {
    const result =
      await api.functional.healthcarePlatform.billingPaymentMethods.index(
        connection,
        {
          body: { organization_id: orgAdmin.id, method_type: methodType },
        },
      );
    typia.assert(result);
    for (const row of result.data) {
      TestValidator.equals(
        `filtered by method_type=${methodType}`,
        row.method_type,
        methodType,
      );
      TestValidator.equals(
        "payment org_id matches",
        row.organization_id,
        orgAdmin.id,
      );
    }
  }
  // 6. Filter by provider_name
  for (const provider of providerNames) {
    const result =
      await api.functional.healthcarePlatform.billingPaymentMethods.index(
        connection,
        {
          body: { organization_id: orgAdmin.id, provider_name: provider },
        },
      );
    typia.assert(result);
    for (const row of result.data) {
      TestValidator.equals(
        `filtered by provider_name=${provider}`,
        row.provider_name,
        provider,
      );
      TestValidator.equals(
        "payment org_id matches",
        row.organization_id,
        orgAdmin.id,
      );
    }
  }
  // 7. Filter by is_active (true and false)
  for (const flag of isActiveOptions) {
    const result =
      await api.functional.healthcarePlatform.billingPaymentMethods.index(
        connection,
        {
          body: { organization_id: orgAdmin.id, is_active: flag },
        },
      );
    typia.assert(result);
    for (const row of result.data) {
      TestValidator.equals(
        `filtered by is_active=${flag}`,
        row.is_active,
        flag,
      );
      TestValidator.equals(
        "payment org_id matches",
        row.organization_id,
        orgAdmin.id,
      );
    }
  }
  // 8. Sort by method_type ASC
  {
    const result =
      await api.functional.healthcarePlatform.billingPaymentMethods.index(
        connection,
        {
          body: { organization_id: orgAdmin.id, sort: "method_type" },
        },
      );
    typia.assert(result);
    const sorted = [...result.data].sort((a, b) =>
      a.method_type.localeCompare(b.method_type),
    );
    TestValidator.equals("sorted method_type ASC", result.data, sorted);
  }
  // 9. Sort by provider_name DESC
  {
    const result =
      await api.functional.healthcarePlatform.billingPaymentMethods.index(
        connection,
        {
          body: { organization_id: orgAdmin.id, sort: "-provider_name" },
        },
      );
    typia.assert(result);
    const sorted = [...result.data].sort((a, b) =>
      b.provider_name!.localeCompare(a.provider_name!),
    );
    TestValidator.equals("sorted provider_name DESC", result.data, sorted);
  }
  // 10. Pagination (page_size=2)
  {
    const page1 =
      await api.functional.healthcarePlatform.billingPaymentMethods.index(
        connection,
        {
          body: { organization_id: orgAdmin.id, page: 1, page_size: 2 },
        },
      );
    typia.assert(page1);
    TestValidator.equals("pagination: page size correct", page1.data.length, 2);
    TestValidator.equals(
      "pagination: current page is 1",
      page1.pagination.current,
      1,
    );
    TestValidator.predicate(
      "pagination: total pages >= 2",
      page1.pagination.pages >= 2,
    );
    // Page 2
    const page2 =
      await api.functional.healthcarePlatform.billingPaymentMethods.index(
        connection,
        {
          body: { organization_id: orgAdmin.id, page: 2, page_size: 2 },
        },
      );
    typia.assert(page2);
    TestValidator.equals(
      "pagination: page size correct (2nd page)",
      page2.data.length,
      2,
    );
  }
  // 11. Negative: invalid filter value (non-existent method_type)
  await TestValidator.error("invalid method_type returns error", async () => {
    await api.functional.healthcarePlatform.billingPaymentMethods.index(
      connection,
      {
        body: {
          organization_id: orgAdmin.id,
          method_type: "not_a_method_type",
        },
      },
    );
  });
}
