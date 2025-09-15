import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformComplianceConsent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceConsent";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate full admin access for viewing compliance consent details,
 * authentication, and rejection for unauthorized/non-existent access.
 *
 * 1. Register a system admin
 * 2. Log in as the system admin
 * 3. Attempt to access a non-existent compliance consent (random UUID) and expect
 *    an error (not found)
 * 4. Attempt to access a compliance consent without authentication and expect an
 *    error (unauthorized)
 */
export async function test_api_compliance_consent_view_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: adminPassword,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;

  const joinRes = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(joinRes);

  // 2. Log in as system admin
  const loginRes = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginRes);
  // At this point connection already has the Authorization header

  // 3. Attempt with a random non-existent complianceConsentId (expect error)
  const nonExistentConsentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Non-existent complianceConsentId returns error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.complianceConsents.at(
        connection,
        {
          complianceConsentId: nonExistentConsentId,
        },
      );
    },
  );

  // 4. Attempt unauthenticated access (expect error)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  const randomConsentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Access without authentication is rejected",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.complianceConsents.at(
        unauthConnection,
        {
          complianceConsentId: randomConsentId,
        },
      );
    },
  );
}
