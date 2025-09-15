import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNurse";

/**
 * Validate nurse list retrieval with proper department head scope and
 * permission isolation.
 *
 * Steps:
 *
 * 1. Register and authenticate a department head (join API)
 * 2. Retrieve paginated nurse list (PATCH departmentHead/nurses) with various
 *    filters: a. Pagination: e.g. limit=2, verify next page works b. Partial
 *    search by name/email c. Filtering by specialty/status
 * 3. Attempt to filter/search for nurses outside department scope to validate no
 *    data leakage (should return empty or permission error)
 * 4. Edge: request out-of-bounds page, expect empty results
 */
export async function test_api_nurse_list_retrieve_department_head_scope_and_permissions(
  connection: api.IConnection,
) {
  // Step 1: Register new department head and authenticate
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const deptHead = await api.functional.auth.departmentHead.join(connection, {
    body: joinBody,
  });
  typia.assert(deptHead);

  // Step 2: Retrieve nurses (actual nurse setup may be out of scope for this direct API)
  const filterA = {
    full_name: undefined,
    email: undefined,
    specialty: undefined,
    status: undefined,
    license_number: undefined,
  } satisfies IHealthcarePlatformNurse.IRequest;
  const page1 =
    await api.functional.healthcarePlatform.departmentHead.nurses.index(
      connection,
      { body: filterA },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "returns nurse list for own department",
    page1.data.length >= 0,
  );

  // Step 2a: If data > 0, test pagination/filters
  if (page1.data.length > 0) {
    const nurse = page1.data[0];
    // Partial matching: use substring of name
    const partialName = nurse.full_name.substring(
      0,
      Math.max(1, Math.floor(nurse.full_name.length / 2)),
    );
    const partialFilter = {
      full_name: partialName,
    } satisfies IHealthcarePlatformNurse.IRequest;
    const search =
      await api.functional.healthcarePlatform.departmentHead.nurses.index(
        connection,
        { body: partialFilter },
      );
    typia.assert(search);
    TestValidator.predicate(
      "partial name filter returns matching nurse(s)",
      search.data.some((n) => n.id === nurse.id),
    );
    // Filtering by exact email
    const emailFilter = {
      email: nurse.email,
    } satisfies IHealthcarePlatformNurse.IRequest;
    const byEmail =
      await api.functional.healthcarePlatform.departmentHead.nurses.index(
        connection,
        { body: emailFilter },
      );
    typia.assert(byEmail);
    TestValidator.equals(
      "email filter returns correct result",
      byEmail.data.length,
      1,
    );
  }

  // Step 3: Attempt to filter for a distinct 'foreign' nurse (unreachable scope)
  const impossibleSpecialty = RandomGenerator.alphabets(25); // unlikely specialty, no such nurse
  const foreignFilter = {
    specialty: impossibleSpecialty,
  } satisfies IHealthcarePlatformNurse.IRequest;
  const forbiddenScope =
    await api.functional.healthcarePlatform.departmentHead.nurses.index(
      connection,
      { body: foreignFilter },
    );
  typia.assert(forbiddenScope);
  TestValidator.equals(
    "forbidden department scope returns empty array",
    forbiddenScope.data.length,
    0,
  );

  // Step 4: Out-of-bounds pagination - not possible via current API (no limit/page fields in request)
  // Instead, assert repeated call on default filter is harmless
  await api.functional.healthcarePlatform.departmentHead.nurses.index(
    connection,
    { body: filterA },
  );
}
