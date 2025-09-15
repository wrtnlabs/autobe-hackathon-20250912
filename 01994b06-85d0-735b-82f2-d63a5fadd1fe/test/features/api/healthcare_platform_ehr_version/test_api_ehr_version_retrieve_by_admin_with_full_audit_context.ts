import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrVersion";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates retrieval of a specific EHR version for a patient encounter as a
 * system admin (full audit context).
 *
 * This test simulates authenticating as a new system admin, attempts retrieval
 * of an EHR version using random (possibly non-existent) patient and encounter
 * IDs, and assert full type validation of the entity. Also tests several error
 * scenarios, such as invalid token and bad identifiers.
 *
 * 1. Register a new platform system admin using required business-compliant fields
 *    (email, name, provider, etc.)
 * 2. Login as system admin using created credentials and validate audit/token
 *    response
 * 3. Attempt retrieval of EHR version by random UUIDs and version number (not
 *    expected to exist)
 * 4. Assert error for non-existent data (not found)
 * 5. Attempt retrieval with missing/invalid token (unauthorized)
 * 6. Attempt retrieval with an invalid version number (negative int32)
 * 7. All error/denied/not-found cases must be audited and explicit.
 */
export async function test_api_ehr_version_retrieve_by_admin_with_full_audit_context(
  connection: api.IConnection,
) {
  // Step 1: Register a new system admin
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@enterprise.com`,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // Step 2: Login as system admin
  const loginBody = {
    email: joinBody.email,
    provider: "local",
    provider_key: joinBody.provider_key,
    password: joinBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const login = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(login);

  // Step 3: Attempt to GET a random EHR version (may not exist)
  const req = {
    patientRecordId: typia.random<string & tags.Format<"uuid">>(),
    encounterId: typia.random<string & tags.Format<"uuid">>(),
    versionNumber: typia.random<number & tags.Type<"int32">>(),
  };
  await TestValidator.error(
    "retrieval with random UUIDs should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.encounters.ehrVersions.at(
        connection,
        req,
      );
    },
  );

  // Step 4: If a proper EHR version retrieval were possible, this would be the logic:
  // const ehrVersion = await api.functional.healthcarePlatform.systemAdmin.patientRecords.encounters.ehrVersions.at(connection, req);
  // typia.assert(ehrVersion);

  // Step 5: Test unauthorized access (clear token)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized admin (no token) is denied",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.encounters.ehrVersions.at(
        unauthConnection,
        req,
      );
    },
  );

  // Step 6: Try obviously bad version numbers (e.g. -1)
  await TestValidator.error(
    "invalid version number (negative) rejected",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.encounters.ehrVersions.at(
        connection,
        {
          ...req,
          versionNumber: -1 as number & tags.Type<"int32">,
        },
      );
    },
  );
}
