import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingDiscountPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingDiscountPolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformBillingDiscountPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingDiscountPolicy";

/**
 * Paginated search and filtering for billing discount policies as an
 * authenticated org admin.
 *
 * 1. Register org admin A and B, log in as A.
 * 2. Create several policies for admin A's org (vary names, types, status). Also
 *    create one for B.
 * 3. Test paginated search: returns correct data for A's org, with accurate
 *    pagination.
 * 4. Test string filter by policy_name (substring).
 * 5. Test type filter by discount_type.
 * 6. Test status filter with is_active true/false.
 * 7. Edge case: very high page, expect empty data and valid page info.
 * 8. Security: search with no auth (expect error), as B (should not see A's
 *    policies).
 * 9. All data type assertions, business rule validations in every step.
 */
export async function test_api_billing_discount_policy_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register admin A
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminAPassword = RandomGenerator.alphaNumeric(12);
  const adminAJoin = {
    email: adminAEmail,
    full_name: RandomGenerator.name(),
    password: adminAPassword,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminAAuthorized = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: adminAJoin,
    },
  );
  typia.assert(adminAAuthorized);

  // 2. Register admin B
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminBPassword = RandomGenerator.alphaNumeric(12);
  const adminBJoin = {
    email: adminBEmail,
    full_name: RandomGenerator.name(),
    password: adminBPassword,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminBAuthorized = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: adminBJoin,
    },
  );
  typia.assert(adminBAuthorized);

  // 3. Log in as admin A (ensure token is set)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminAEmail,
      password: adminAPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. Create N discount policies for admin A (varying name, type, status)
  const createdPolicies: IHealthcarePlatformBillingDiscountPolicy[] =
    await ArrayUtil.asyncRepeat(5, async (idx) => {
      const pType = RandomGenerator.pick([
        "percentage",
        "fixed",
        "sliding_scale",
      ] as const);
      const isActive = idx % 2 === 0;
      const policy =
        await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.create(
          connection,
          {
            body: {
              organization_id: adminAAuthorized.id,
              policy_name: `Test Policy ${RandomGenerator.paragraph({ sentences: 2 })} ${idx}`,
              discount_type: pType,
              is_active: isActive,
              description: RandomGenerator.content({
                paragraphs: 1,
                sentenceMin: 3,
                sentenceMax: 6,
              }),
            } satisfies IHealthcarePlatformBillingDiscountPolicy.ICreate,
          },
        );
      typia.assert(policy);
      return policy;
    });

  // 5. Create 1 policy for admin B for cross-org/tenant isolation test
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminBEmail,
      password: adminBPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const crossOrgPolicy =
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.create(
      connection,
      {
        body: {
          organization_id: adminBAuthorized.id,
          policy_name: `Other org Policy ${RandomGenerator.name()}`,
          discount_type: RandomGenerator.pick(["fixed", "percentage"] as const),
          is_active: true,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IHealthcarePlatformBillingDiscountPolicy.ICreate,
      },
    );
  typia.assert(crossOrgPolicy);

  // 6. Log back in as admin A
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminAEmail,
      password: adminAPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 7. (a) Paginated search:  page 0 (default), expect only admin A policies, correct data
  const baseSearchReq = {
    organization_id: adminAAuthorized.id,
  } satisfies IHealthcarePlatformBillingDiscountPolicy.IRequest;
  const pageResult =
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.index(
      connection,
      {
        body: baseSearchReq,
      },
    );
  typia.assert(pageResult);
  TestValidator.predicate(
    "returns only org A's policies",
    pageResult.data.every((p) => p.organization_id === adminAAuthorized.id),
  );
  TestValidator.predicate(
    "contains at least all created policies",
    createdPolicies.every((cp) => pageResult.data.some((p) => p.id === cp.id)),
  );
  TestValidator.equals(
    "page current should be 0",
    pageResult.pagination.current,
    0,
  );

  // (b) Filter by partial policy_name substring (using a known part of a created policy)
  const samplePolicy = createdPolicies[0];
  const keyword = samplePolicy.policy_name.split(" ")[1];
  const nameFiltered =
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.index(
      connection,
      {
        body: {
          organization_id: adminAAuthorized.id,
          policy_name: keyword,
        },
      },
    );
  typia.assert(nameFiltered);
  TestValidator.predicate(
    "policy_name filter returns policies with keyword",
    nameFiltered.data.every((p) => p.policy_name.includes(keyword)),
  );

  // (c) Filter by discount_type
  const sampleType = createdPolicies[1].discount_type;
  const typeFiltered =
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.index(
      connection,
      {
        body: {
          organization_id: adminAAuthorized.id,
          discount_type: sampleType,
        },
      },
    );
  typia.assert(typeFiltered);
  TestValidator.predicate(
    "discount_type filter returns correct type",
    typeFiltered.data.every((p) => p.discount_type === sampleType),
  );

  // (d) Filter by is_active (true, then false)
  const activeFilter =
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.index(
      connection,
      {
        body: {
          organization_id: adminAAuthorized.id,
          is_active: true,
        },
      },
    );
  typia.assert(activeFilter);
  TestValidator.predicate(
    "is_active true filter",
    activeFilter.data.every((p) => p.is_active),
  );

  const inactiveFilter =
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.index(
      connection,
      {
        body: {
          organization_id: adminAAuthorized.id,
          is_active: false,
        },
      },
    );
  typia.assert(inactiveFilter);
  TestValidator.predicate(
    "is_active false filter",
    inactiveFilter.data.every((p) => !p.is_active),
  );

  // (e) Excess page number: e.g., current=99, expect empty data
  const excessPage =
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.index(
      connection,
      {
        body: {
          organization_id: adminAAuthorized.id,
          // No pagination controls in IRequest, but logic can be approximated by checking last page and requesting higher if available.
          // Here we just check a page number that does not exist
          created_at_from: "2099-01-01T00:00:00Z", // future start: should yield no results
        },
      },
    );
  typia.assert(excessPage);
  TestValidator.equals(
    "excess page yields empty data",
    excessPage.data.length,
    0,
  );

  // 8. Security: No-auth search (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("search without auth should fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.index(
      unauthConn,
      {
        body: {
          organization_id: adminAAuthorized.id,
        },
      },
    );
  });

  // 9. Cross-org isolation: as admin B, confirm cannot fetch A's policies
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminBEmail,
      password: adminBPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const crossOrgSearch =
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.index(
      connection,
      {
        body: {
          organization_id: adminAAuthorized.id,
        },
      },
    );
  typia.assert(crossOrgSearch);
  TestValidator.equals(
    "no policies for cross-org search",
    crossOrgSearch.data.length,
    0,
  );
}
