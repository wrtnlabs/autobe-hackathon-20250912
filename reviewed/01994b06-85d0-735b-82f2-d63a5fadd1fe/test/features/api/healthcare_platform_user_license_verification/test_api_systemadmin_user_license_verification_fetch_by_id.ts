import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserLicenseVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserLicenseVerification";

/**
 * Test that a system administrator can fetch details for a user license
 * verification by ID, and that RBAC/organization enforcement and error
 * cases work.
 *
 * Steps:
 *
 * 1. Register and login a system admin user (primary admin).
 * 2. Use the system admin context to attempt fetching a user license
 *    verification record by ID: a. Use random/mock ID for negative test
 *    (should error or 404). b. Use a real ID (from typia.random or get if
 *    present).
 *
 *    - Validate all core fields (status, type, user, timestamps). c. Soft-delete
 *         handling is not actionable due to lack of a create/delete API; we
 *         comment as limitation. d. Register and login another admin for a
 *         different org (simulate via different email). e. Use this new
 *         admin to try to fetch the original license verification (should
 *         error for forbidden or not found).
 *
 * Validate all logic using typia.assert(response). Use TestValidator.error
 * for error cases. Validate all data returned matches expectation.
 */
export async function test_api_systemadmin_user_license_verification_fetch_by_id(
  connection: api.IConnection,
) {
  // 1. Register and login the primary system admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(admin);

  // 2. Positive path: fetch a license verification by ID
  // We use typia.random to simulate the ID (in a real flow, we'd create this via an API, but creation is not available)
  const recordMock: IHealthcarePlatformUserLicenseVerification =
    typia.random<IHealthcarePlatformUserLicenseVerification>();

  // Fetch should succeed only for a valid/known ID.
  // For mock, we simulate that the record exists and is not soft-deleted
  const output =
    await api.functional.healthcarePlatform.systemAdmin.userLicenseVerifications.at(
      connection,
      {
        userLicenseVerificationId: recordMock.id as string &
          tags.Format<"uuid">,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "Fetched license verification matches ID",
    output.id,
    recordMock.id,
  );
  TestValidator.predicate(
    "Verification status is present",
    !!output.verification_status,
  );
  TestValidator.predicate(
    "Record is not soft-deleted",
    !output.suspend_reason || !output.verification_status.includes("deleted"),
  );

  // 3. Negative path: non-existent ID (random UUID)
  await TestValidator.error(
    "Fetching non-existent license verification errors",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userLicenseVerifications.at(
        connection,
        {
          userLicenseVerificationId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );

  // 4. RBAC/org enforcement: create another admin (different email)
  const admin2JoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin2 = await api.functional.auth.systemAdmin.join(connection, {
    body: admin2JoinInput,
  });
  typia.assert(admin2);

  // Login as the new admin
  const admin2Login = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: admin2JoinInput.email,
      provider: admin2JoinInput.provider,
      provider_key: admin2JoinInput.provider_key,
      password: admin2JoinInput.password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(admin2Login);

  // Attempt fetch: should error (forbidden OR not found)
  await TestValidator.error(
    "Cross-org license verification access is forbidden or not found",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userLicenseVerifications.at(
        connection,
        {
          userLicenseVerificationId: recordMock.id as string &
            tags.Format<"uuid">,
        },
      );
    },
  );
}
