import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";

/**
 * Validate nurse account registration (join) and initial authentication.
 *
 * This test ensures that a nurse can successfully register with - a unique
 * business email, - a full legal name, - a license number, - and an optional
 * phone number. It asserts that the API returns: - all nurse profile properties
 * matching input, - proper timestamp fields, - a valid authentication JWT token
 * object.
 *
 * Steps:
 *
 * 1. Generate unique, valid nurse join data (business email, legal name, license,
 *    phone).
 * 2. Call api.functional.auth.nurse.join with valid join data.
 * 3. Assert the response type and structure, compare core fields to input, and
 *    validate token presence.
 */
export async function test_api_nurse_join_success(connection: api.IConnection) {
  // 1. Generate valid unique nurse join input
  // Force business email domain for eligibility, unique by using random generator
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@acmehealth.org` as string &
      tags.Format<"email">,
    full_name: RandomGenerator.name(2),
    license_number: `LIC-${RandomGenerator.alphaNumeric(4).toUpperCase()}${RandomGenerator.alphaNumeric(4)}`,
    specialty: "ICU",
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformNurse.IJoin;

  // 2. Call the API
  const result = await api.functional.auth.nurse.join(connection, {
    body: joinBody,
  });

  // 3. Validate response type and content
  typia.assert(result);
  TestValidator.equals(
    "returned email matches input",
    result.email,
    joinBody.email,
  );
  TestValidator.equals(
    "returned full name matches input",
    result.full_name,
    joinBody.full_name,
  );
  TestValidator.equals(
    "returned license number matches input",
    result.license_number,
    joinBody.license_number,
  );
  TestValidator.equals(
    "returned specialty matches input",
    result.specialty,
    joinBody.specialty,
  );
  TestValidator.equals(
    "returned phone matches input",
    result.phone,
    joinBody.phone,
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof result.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof result.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result.updated_at),
  );
  TestValidator.equals("not logically deleted", result.deleted_at, null);

  // Token structure
  typia.assert(result.token);
  TestValidator.predicate(
    "access token present",
    typeof result.token.access === "string" && result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    typeof result.token.refresh === "string" && result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is ISO date-time",
    typeof result.token.expired_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is ISO date-time",
    typeof result.token.refreshable_until === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
        result.token.refreshable_until,
      ),
  );
}
