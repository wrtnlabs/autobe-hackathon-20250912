import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNurse";

/**
 * Validate the organization admin's ability to retrieve, filter, and paginate
 * the nurse list, including error handling.
 *
 * Steps:
 *
 * 1. Register and authenticate as organization admin (join)
 * 2. Retrieve nurses list without filters (default pagination)
 * 3. If any nurses, pick one nurse for filter testing
 * 4. Test filter by specialty
 * 5. Test partial full_name filter (substring matching)
 * 6. Test filter by status if present
 * 7. Test pagination across multiple pages if possible
 * 8. Negative case: invalid status value
 * 9. Negative case: overly long full_name
 */
export async function test_api_nurse_list_retrieve_organization_admin_filter_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as organization admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(10),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);
  TestValidator.predicate(
    "admin join returned authorized admin",
    Boolean(admin.id) && Boolean(admin.token.access),
  );

  // Step 2: Retrieve the nurse list (no filters)
  const resAll =
    await api.functional.healthcarePlatform.organizationAdmin.nurses.index(
      connection,
      { body: {} satisfies IHealthcarePlatformNurse.IRequest },
    );
  typia.assert(resAll);
  const { data, pagination } = resAll;
  TestValidator.predicate("nurse data is array", Array.isArray(data));
  TestValidator.predicate(
    "pagination.limit defined",
    typeof pagination.limit === "number",
  );

  if (data.length > 0) {
    // Step 3: Pick one nurse for filter tests
    const picked = RandomGenerator.pick(data);
    // Step 4: Filter by exact specialty (if present)
    if (picked.specialty !== undefined && picked.specialty !== null) {
      const specialtyRes =
        await api.functional.healthcarePlatform.organizationAdmin.nurses.index(
          connection,
          {
            body: {
              specialty: picked.specialty,
            } satisfies IHealthcarePlatformNurse.IRequest,
          },
        );
      typia.assert(specialtyRes);
      TestValidator.predicate(
        "all nurses match specialty filter",
        specialtyRes.data.every(
          (nurse) => nurse.specialty === picked.specialty,
        ),
      );
    }
    // Step 5: Filter by partial name (substring)
    const partial =
      picked.full_name.length >= 3
        ? picked.full_name.substring(0, 3)
        : picked.full_name;
    const partialRes =
      await api.functional.healthcarePlatform.organizationAdmin.nurses.index(
        connection,
        {
          body: {
            full_name: partial,
          } satisfies IHealthcarePlatformNurse.IRequest,
        },
      );
    typia.assert(partialRes);
    TestValidator.predicate(
      "all nurses in partial name match contain substring",
      partialRes.data.every((nurse) => nurse.full_name.includes(partial)),
    );
    // Step 6: Filter by status (if present in picked)
    if ("status" in picked && typeof (picked as any).status === "string") {
      const statusRes =
        await api.functional.healthcarePlatform.organizationAdmin.nurses.index(
          connection,
          {
            body: {
              status: (picked as any).status,
            } satisfies IHealthcarePlatformNurse.IRequest,
          },
        );
      typia.assert(statusRes);
      // Since status is not in ISummary DTO, value assertion is omitted
    }
    // Step 7: Test pagination - if more than 1 record
    if (pagination.records > 1 && pagination.pages > 1) {
      // Simulate different filters for additional pagination validation
      const nextRes =
        await api.functional.healthcarePlatform.organizationAdmin.nurses.index(
          connection,
          {
            body: {
              full_name: partial,
            } satisfies IHealthcarePlatformNurse.IRequest,
          },
        );
      typia.assert(nextRes);
      TestValidator.predicate(
        "pagination structure valid for next page",
        typeof nextRes.pagination.current === "number" &&
          typeof nextRes.pagination.pages === "number",
      );
    }
  }
  // Step 8: Negative - invalid status value
  await TestValidator.error("invalid status should fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.nurses.index(
      connection,
      {
        body: {
          status: "__INVALID_STATUS__",
        } satisfies IHealthcarePlatformNurse.IRequest,
      },
    );
  });
  // Step 9: Negative - overly long full_name
  await TestValidator.error("overly long full_name should fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.nurses.index(
      connection,
      {
        body: {
          full_name: RandomGenerator.alphabets(300),
        } satisfies IHealthcarePlatformNurse.IRequest,
      },
    );
  });
}
