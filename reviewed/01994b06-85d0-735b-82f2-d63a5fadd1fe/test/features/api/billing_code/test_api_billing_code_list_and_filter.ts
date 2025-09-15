import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingCode";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformBillingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingCode";

/**
 * Validate listing and filter/search of billing codes as an organization admin.
 *
 * The test flow is as follows:
 *
 * 1. Onboard/register a new organization admin (unique email, valid random data)
 * 2. Login as the organization admin (fresh authentication context)
 * 3. Create at least 2 billing codes, one with active=true, one with active=false,
 *    with known properties for exact/partial matching
 * 4. List all billing codes (no filters) and check both codes appear in results
 * 5. Search by exact code, partial code (prefix), by code_system, name, and
 *    active/inactive status
 * 6. Validate filter combinations (e.g., code_system+active)
 * 7. Assert correct paging (page, pageSize), structure, order, and content of
 *    results; verify functional filters work as expected
 * 8. Attempt filter with syntactically valid but non-existent code/code_system
 * 9. Try business error case: unsupported filter values or logic outside business
 *    rule (without type errors)
 * 10. Confirm all results follow summary structure, have correct keys, and that no
 *     'retired' code appears in active filter, etc.
 *
 * The test covers both basic listing and search, filter edge cases, and
 * positive/negative result scenarios. All business and security requirements
 * are observed, and type integrity is enforced strictly.
 */
export async function test_api_billing_code_list_and_filter(
  connection: api.IConnection,
) {
  // Step 1: Register a new organization admin for search context
  const orgEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "SecureP@ssw0rd!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);

  // Step 2: Login as the org admin (simulate new session)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgEmail,
      password: "SecureP@ssw0rd!",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Step 3: Create two codes for testing (active/inactive) with predictable/random props
  const activeCodeProp = {
    code: RandomGenerator.alphaNumeric(6),
    code_system: RandomGenerator.name(1),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
      sentenceMax: 10,
    }),
    active: true,
  } satisfies IHealthcarePlatformBillingCode.ICreate;
  const inactiveCodeProp = {
    code: RandomGenerator.alphaNumeric(8),
    code_system: RandomGenerator.name(1),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 12 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
    active: false,
  } satisfies IHealthcarePlatformBillingCode.ICreate;
  const activeCode =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.create(
      connection,
      { body: activeCodeProp },
    );
  const inactiveCode =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.create(
      connection,
      { body: inactiveCodeProp },
    );
  typia.assert(activeCode);
  typia.assert(inactiveCode);

  // Step 4: List all codes (no filters)
  const listed =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.index(
      connection,
      { body: {} satisfies IHealthcarePlatformBillingCode.IRequest },
    );
  typia.assert(listed);
  TestValidator.predicate(
    "both created codes appear in full list",
    listed.data.some(
      (i) =>
        i.code === activeCode.code && i.code_system === activeCode.code_system,
    ) &&
      listed.data.some(
        (i) =>
          i.code === inactiveCode.code &&
          i.code_system === inactiveCode.code_system,
      ),
  );

  // Step 5: Search/filter by code (exact)
  const foundByCode =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.index(
      connection,
      {
        body: {
          code: activeCode.code,
        } satisfies IHealthcarePlatformBillingCode.IRequest,
      },
    );
  typia.assert(foundByCode);
  TestValidator.equals(
    "exact code search finds one",
    foundByCode.data.length,
    1,
  );
  TestValidator.equals(
    "code returned matches",
    foundByCode.data[0].code,
    activeCode.code,
  );

  // Step 5b: Partial code search
  const partialCodePrefix = activeCode.code.slice(0, 3);
  const foundByCodePrefix =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.index(
      connection,
      {
        body: {
          code: partialCodePrefix,
        } satisfies IHealthcarePlatformBillingCode.IRequest,
      },
    );
  typia.assert(foundByCodePrefix);
  TestValidator.predicate(
    "partial code prefix matches something",
    foundByCodePrefix.data.length >= 1,
  );
  TestValidator.predicate(
    "all returned codes match prefix",
    foundByCodePrefix.data.every((i) => i.code.startsWith(partialCodePrefix)),
  );

  // Step 6: Filter by code_system
  const foundBySystem =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.index(
      connection,
      {
        body: {
          code_system: activeCode.code_system,
        } satisfies IHealthcarePlatformBillingCode.IRequest,
      },
    );
  typia.assert(foundBySystem);
  TestValidator.predicate(
    "at least one has the right code_system",
    foundBySystem.data.some((i) => i.code_system === activeCode.code_system),
  );

  // Step 7: Filter by name
  const foundByName =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.index(
      connection,
      {
        body: {
          name: activeCode.name.slice(0, 3),
        } satisfies IHealthcarePlatformBillingCode.IRequest,
      },
    );
  typia.assert(foundByName);
  TestValidator.predicate(
    "match by beginning of name succeeds",
    foundByName.data.some((i) =>
      i.name.startsWith(activeCode.name.slice(0, 3)),
    ),
  );

  // Step 8: Filter by active/inactive status
  const onlyActive =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.index(
      connection,
      {
        body: {
          active: true,
        } satisfies IHealthcarePlatformBillingCode.IRequest,
      },
    );
  typia.assert(onlyActive);
  TestValidator.predicate(
    "only active codes included",
    onlyActive.data.every((i) => i.active === true),
  );
  TestValidator.predicate(
    "newly created inactive code does not show in active filter",
    onlyActive.data.every((i) => i.code !== inactiveCode.code),
  );

  const onlyInactive =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.index(
      connection,
      {
        body: {
          active: false,
        } satisfies IHealthcarePlatformBillingCode.IRequest,
      },
    );
  typia.assert(onlyInactive);
  TestValidator.predicate(
    "only inactive codes included",
    onlyInactive.data.every((i) => i.active === false),
  );

  // Step 9: Filter by code_system and active together
  const bySystemAndActive =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.index(
      connection,
      {
        body: {
          code_system: activeCode.code_system,
          active: true,
        } satisfies IHealthcarePlatformBillingCode.IRequest,
      },
    );
  typia.assert(bySystemAndActive);
  TestValidator.predicate(
    "all results have matching code_system and active:true",
    bySystemAndActive.data.every(
      (i) => i.code_system === activeCode.code_system && i.active === true,
    ),
  );

  // Step 10: Paging - request one item per page, validate correct count/limit and content
  const pageSize1 =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.index(
      connection,
      {
        body: {
          page: 1,
          pageSize: 1,
        } satisfies IHealthcarePlatformBillingCode.IRequest,
      },
    );
  typia.assert(pageSize1);
  TestValidator.equals(
    "pagination returns one item per page",
    pageSize1.data.length,
    1,
  );
  TestValidator.equals("pagination page is 1", pageSize1.pagination.current, 1);
  TestValidator.equals("pageSize matches", pageSize1.pagination.limit, 1);

  // Step 11: Order by code ascending/descending
  const ascResult =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.index(
      connection,
      {
        body: {
          sortBy: "code",
          sortDir: "asc",
        } satisfies IHealthcarePlatformBillingCode.IRequest,
      },
    );
  typia.assert(ascResult);
  const descResult =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.index(
      connection,
      {
        body: {
          sortBy: "code",
          sortDir: "desc",
        } satisfies IHealthcarePlatformBillingCode.IRequest,
      },
    );
  typia.assert(descResult);
  if (ascResult.data.length > 1 && descResult.data.length > 1) {
    TestValidator.notEquals(
      "asc/desc order results differ if >1",
      ascResult.data.map((i) => i.id),
      descResult.data.map((i) => i.id),
    );
  }

  // Step 12: Negative/edge: filter with non-existent code
  const notFound =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.index(
      connection,
      {
        body: {
          code: "NONEXISTENTCODE",
        } satisfies IHealthcarePlatformBillingCode.IRequest,
      },
    );
  typia.assert(notFound);
  TestValidator.equals(
    "query for nonexistent code returns empty result",
    notFound.data.length,
    0,
  );

  // Step 13: Negative/edge: filter with non-existent code_system
  const nonExistSystem =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.index(
      connection,
      {
        body: {
          code_system: "NOSYSTEM",
        } satisfies IHealthcarePlatformBillingCode.IRequest,
      },
    );
  typia.assert(nonExistSystem);
  TestValidator.equals(
    "query for nonexistent code_system returns empty result",
    nonExistSystem.data.length,
    0,
  );

  // Step 14: Negative/edge: filter with empty name (should return all or none; not error)
  const allOrNone =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.index(
      connection,
      { body: { name: "" } satisfies IHealthcarePlatformBillingCode.IRequest },
    );
  typia.assert(allOrNone);

  // Step 15: Error: syntactically correct but unsupported filter (e.g. sortBy one not present on model)
  await TestValidator.error("invalid sortBy value fails", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.index(
      connection,
      {
        body: {
          sortBy: "notAField",
        } satisfies IHealthcarePlatformBillingCode.IRequest,
      },
    );
  });

  // Note: Step 16 (attempting to break typing with invalid sortDir as any) is REMOVED, as type error scenarios are not allowed. No type mismatch testing present in this final version.
}
