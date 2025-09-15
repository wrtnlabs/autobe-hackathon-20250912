import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate the system admin insurance claim status deletion protection for
 * fabricated/non-existent IDs and lack of authorization.
 *
 * 1. Register a new healthcare platform system admin (email/password).
 * 2. Log in as the newly created system admin (establish session).
 * 3. Generate random (fabricated) UUIDs for insuranceClaimId and
 *    insuranceClaimStatusId.
 * 4. Attempt deletion of the claim status at DELETE
 *    /healthcarePlatform/systemAdmin/insuranceClaims/{insuranceClaimId}/insuranceClaimStatuses/{insuranceClaimStatusId}
 *    with the fabricated values.
 * 5. Confirm that the operation results in an error (not found or forbidden).
 *    Use TestValidator.error().
 * 6. Optionally, try deletion with valid/invalid insuranceClaimId pairings if
 *    scenario supported (for this test, only random UUIDs used).
 * 7. (Note: No actual deletion can occur; this is a negative/authorization E2E
 *    scenario.)
 */
export async function test_api_insurance_claim_status_deletion_system_admin_nonexistent_or_unauthorized(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);
  // 2. Log in as this admin to set session
  const loginInput = {
    email: joinInput.email,
    provider: "local",
    provider_key: joinInput.provider_key,
    password: joinInput.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loginResp = await api.functional.auth.systemAdmin.login(connection, {
    body: loginInput,
  });
  typia.assert(loginResp);
  // 3. Generate fabricated IDs
  const insuranceClaimId = typia.random<string & tags.Format<"uuid">>();
  const insuranceClaimStatusId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt deletion with non-existent IDs - should fail
  await TestValidator.error(
    "system admin delete with non-existent IDs should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.insuranceClaims.insuranceClaimStatuses.erase(
        connection,
        {
          insuranceClaimId,
          insuranceClaimStatusId,
        },
      );
    },
  );
}
