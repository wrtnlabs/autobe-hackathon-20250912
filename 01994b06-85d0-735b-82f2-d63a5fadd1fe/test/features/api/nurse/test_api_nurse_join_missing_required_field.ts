import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";

/**
 * Validate the nurse join API rejects requests where a required string field is
 * provided but left blank.
 *
 * This test deliberately provides all required fields (email, full_name,
 * license_number), but sets each field to an empty string in separate test
 * cases. This simulates client mistakes of submitting blank but present fields
 * (violating business validation, not type safety). Only runtime validation
 * business logic is tested (no TypeScript type errors).
 *
 * 1. Join with blank email ("").
 * 2. Join with blank full_name ("").
 * 3. Join with blank license_number (""). For each case, assert the API returns a
 *    validation/business error.
 */
export async function test_api_nurse_join_missing_required_field(
  connection: api.IConnection,
) {
  // 1. Blank 'email' (empty string)
  await TestValidator.error("nurse join fails with blank email", async () => {
    await api.functional.auth.nurse.join(connection, {
      body: {
        email: "" as string & tags.Format<"email">,
        full_name: RandomGenerator.name(),
        license_number: RandomGenerator.alphaNumeric(8),
      } satisfies IHealthcarePlatformNurse.IJoin,
    });
  });
  // 2. Blank 'full_name'
  await TestValidator.error(
    "nurse join fails with blank full_name",
    async () => {
      await api.functional.auth.nurse.join(connection, {
        body: {
          email: (RandomGenerator.name(1) + "@company.com") as string &
            tags.Format<"email">,
          full_name: "",
          license_number: RandomGenerator.alphaNumeric(8),
        } satisfies IHealthcarePlatformNurse.IJoin,
      });
    },
  );
  // 3. Blank 'license_number'
  await TestValidator.error(
    "nurse join fails with blank license_number",
    async () => {
      await api.functional.auth.nurse.join(connection, {
        body: {
          email: (RandomGenerator.name(1) + "@company.com") as string &
            tags.Format<"email">,
          full_name: RandomGenerator.name(),
          license_number: "",
        } satisfies IHealthcarePlatformNurse.IJoin,
      });
    },
  );
}
