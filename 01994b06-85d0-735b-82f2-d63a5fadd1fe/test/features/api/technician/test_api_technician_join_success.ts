import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Validate technician registration (join) for a new healthcare platform
 * technician account.
 *
 * This test ensures a technician can successfully register with a unique
 * business email, full legal name, and license number, and that upon successful
 * registration, the returned profile includes all required identity fields and
 * a valid authorization token. It also ensures that duplicate registrations are
 * rejected. Type validation, including ID/UUID and date/time formats, is
 * guaranteed by typia.assert calls and not redundantly checked here.
 *
 * Process:
 *
 * 1. Generate a technician join data payload with a unique business email, full
 *    name, license number, and optional phone.
 * 2. Call the /auth/technician/join API and verify successful creation.
 * 3. Validate profile fields match input, and typia.assert guarantees schema and
 *    format correctness.
 * 4. Attempt to re-join with the same credentials and confirm that a duplicate is
 *    not allowed.
 */
export async function test_api_technician_join_success(
  connection: api.IConnection,
) {
  // 1. Generate unique technician join request
  const technicianJoin = {
    email: `${RandomGenerator.alphabets(8)}@company-healthcare.com`,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(10),
    specialty: RandomGenerator.name(1),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformTechnician.IJoin;

  // 2. Submit registration request to /auth/technician/join
  const authorized = await api.functional.auth.technician.join(connection, {
    body: technicianJoin,
  });
  typia.assert(authorized);

  // 3. Validate returned profile fields match submitted data
  TestValidator.equals(
    "registered email returned",
    authorized.email,
    technicianJoin.email,
  );
  TestValidator.equals(
    "full legal name returned",
    authorized.full_name,
    technicianJoin.full_name,
  );
  TestValidator.equals(
    "license number returned",
    authorized.license_number,
    technicianJoin.license_number,
  );
  TestValidator.equals(
    "specialty returned",
    authorized.specialty,
    technicianJoin.specialty,
  );
  TestValidator.equals(
    "phone returned",
    authorized.phone,
    technicianJoin.phone,
  );

  // (Format/type fields such as id, created_at, updated_at, token are already checked by typia.assert)

  // 4. Attempt to register duplicate technician (should be rejected)
  await TestValidator.error(
    "duplicate technician join must be rejected",
    async () => {
      await api.functional.auth.technician.join(connection, {
        body: technicianJoin,
      });
    },
  );
}
