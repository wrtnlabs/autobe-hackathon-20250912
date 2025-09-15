import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformSystemadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformSystemadmin";

/**
 * Validates paginated retrieval and filtering of system administrators.
 *
 * 1. Register 3+ system administrator accounts with unique emails and
 *    full_names.
 * 2. Log in as one of these admins to obtain session.
 * 3. Test unfiltered retrieval: PATCH
 *    /healthcarePlatform/systemAdmin/systemadmins with no filter - should
 *    list all admins (paginated).
 *
 *    - Assert each record is a valid ISummary type and email/full_name/status
 *         are present.
 *    - Assert pagination metadata matches total count, limit, and pages.
 * 4. Test filter by partial email: pick substring from a known email, query
 *    with it, and assert all returned have that substring.
 * 5. Test filter by full_name: pick an admin's full_name and query, assert
 *    filter effect and only matching admin in results.
 * 6. Test filter by status: (all 'active' upon join), use status filter and
 *    confirm all status fields are 'active'.
 * 7. Test filter with no match: query with rare string, expect data array
 *    length is 0, pagination adjusted, etc.
 * 8. Test high page number: request a page far beyond total pages, expect
 *    empty data[] and correct pagination.
 * 9. Test invalid filter (e.g., negative page): expect error.
 * 10. (Optional) If possible, register a 'deleted' or 'inactive' admin, test
 *     status filter accuracy.
 */
export async function test_api_systemadmin_list_pagination_filtering(
  connection: api.IConnection,
) {
  // System admin registration
  const admins = await ArrayUtil.asyncRepeat(4, async (i) => {
    const email = `sysadmin${i}_${RandomGenerator.alphabets(5)}@enterprise-corp.com`;
    const full_name = RandomGenerator.name(2);
    const admin = await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email,
        full_name,
        provider: "local",
        provider_key: email,
        password: "TestPassword123!",
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
    typia.assert(admin);
    return { email, full_name, admin };
  });

  // Login as first admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: admins[0].email,
      provider: "local",
      provider_key: admins[0].email,
      password: "TestPassword123!",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 1. Unfiltered paginated listing
  let res =
    await api.functional.healthcarePlatform.systemAdmin.systemadmins.index(
      connection,
      { body: {} satisfies IHealthcarePlatformSystemAdmin.IRequest },
    );
  typia.assert(res);
  // Page metadata validation
  TestValidator.equals(
    "records count >= total admins created",
    res.pagination.records >= admins.length,
    true,
  );
  TestValidator.predicate("data not empty", res.data.length > 0);
  res.data.forEach((item) => {
    typia.assert(item);
    TestValidator.predicate("email present", !!item.email);
    TestValidator.predicate("full_name present", !!item.full_name);
    TestValidator.predicate("status present", !!item.status);
  });

  // 2. Filter by email substring
  const emailSubstr = admins[1].email.substring(3, 10);
  res = await api.functional.healthcarePlatform.systemAdmin.systemadmins.index(
    connection,
    {
      body: {
        email: emailSubstr,
      } satisfies IHealthcarePlatformSystemAdmin.IRequest,
    },
  );
  typia.assert(res);
  TestValidator.predicate(
    "all emails contain substring",
    res.data.every((d) => d.email.includes(emailSubstr)),
  );

  // 3. Filter by full_name (exact match)
  const fullName = admins[2].full_name;
  res = await api.functional.healthcarePlatform.systemAdmin.systemadmins.index(
    connection,
    {
      body: {
        full_name: fullName,
      } satisfies IHealthcarePlatformSystemAdmin.IRequest,
    },
  );
  typia.assert(res);
  TestValidator.equals(
    "at least one with full_name",
    res.data.some((d) => d.full_name === fullName),
    true,
  );
  TestValidator.predicate(
    "all returned have full_name if non-empty",
    res.data.length === 0 || res.data.every((d) => d.full_name === fullName),
  );

  // 4. Filter by status (all active)
  res = await api.functional.healthcarePlatform.systemAdmin.systemadmins.index(
    connection,
    {
      body: {
        status: "active",
      } satisfies IHealthcarePlatformSystemAdmin.IRequest,
    },
  );
  typia.assert(res);
  TestValidator.predicate(
    "all status are active",
    res.data.every((d) => d.status === "active"),
  );

  // 5. Filter with no matches
  res = await api.functional.healthcarePlatform.systemAdmin.systemadmins.index(
    connection,
    {
      body: {
        email: "zz_unlikely_match",
      } satisfies IHealthcarePlatformSystemAdmin.IRequest,
    },
  );
  typia.assert(res);
  TestValidator.equals("no match returns empty array", res.data.length, 0);

  // 6. Excessive high page number
  res = await api.functional.healthcarePlatform.systemAdmin.systemadmins.index(
    connection,
    {
      body: {
        page: 1000 satisfies number as number,
      } satisfies IHealthcarePlatformSystemAdmin.IRequest,
    },
  );
  typia.assert(res);
  TestValidator.equals("empty page at high page number", res.data.length, 0);
  TestValidator.predicate("pagination object still present", !!res.pagination);

  // 7. Invalid filter (negative page)
  await TestValidator.error("negative page param must throw", async () => {
    await api.functional.healthcarePlatform.systemAdmin.systemadmins.index(
      connection,
      {
        body: {
          page: -1 satisfies number as number,
        } satisfies IHealthcarePlatformSystemAdmin.IRequest,
      },
    );
  });

  // (Optional) TODO: register a deleted/inactive admin and test 'status' filter once there is an API to do so.
}
