import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformComplianceConsent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceConsent";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validates creation of a new compliance consent by organization admin,
 * including user provisioning, successful consent creation, and business rule
 * enforcement for duplicate and invalid input.
 *
 * Steps:
 *
 * 1. Register a new organization admin via POST /auth/organizationAdmin/join
 * 2. Login the org admin using POST /auth/organizationAdmin/login
 * 3. Generate valid UUIDs for organization_id, policy_version_id, subject_id, plus
 *    consent_type, granted=true, and consent_at (now)
 * 4. Call POST /healthcarePlatform/organizationAdmin/complianceConsents with valid
 *    consent input, assert response
 * 5. Attempt duplicate consent (same org_id, subject_id, policy_version_id,
 *    consent_type, granted), expect error
 * 6. Try creation with a non-existent policy_version_id, expect error
 */
export async function test_api_compliance_consent_create_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const joinRes = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: adminFullName,
      password: "Password123!",
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(joinRes);
  // 2. Login as the org admin
  const loginRes = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: "Password123!",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginRes);
  // 3. Prepare compliance consent fields (all UUIDs are random)
  const organization_id = joinRes.id;
  const policy_version_id = typia.random<string & tags.Format<"uuid">>();
  const subject_id = typia.random<string & tags.Format<"uuid">>();
  const consent_type = RandomGenerator.name(1);
  const consent_at = new Date().toISOString();
  // 4. Create a compliance consent (happy path)
  const consentBody = {
    organization_id,
    subject_id,
    policy_version_id,
    consent_type,
    granted: true,
    consent_at,
  } satisfies IHealthcarePlatformComplianceConsent.ICreate;
  const consent =
    await api.functional.healthcarePlatform.organizationAdmin.complianceConsents.create(
      connection,
      { body: consentBody },
    );
  typia.assert(consent);
  TestValidator.equals(
    "created consent matches organization_id",
    consent.organization_id,
    organization_id,
  );
  TestValidator.equals(
    "created consent matches subject_id",
    consent.subject_id,
    subject_id,
  );
  TestValidator.equals(
    "created consent matches policy_version_id",
    consent.policy_version_id,
    policy_version_id,
  );
  TestValidator.equals(
    "created consent matches consent_type",
    consent.consent_type,
    consent_type,
  );
  TestValidator.equals(
    "created consent matches granted",
    consent.granted,
    true,
  );
  // 5. Attempt to create duplicate consent (same keys)
  await TestValidator.error("duplicate consent not allowed", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.complianceConsents.create(
      connection,
      { body: consentBody },
    );
  });
  // 6. Try creation with a non-existent policy_version_id
  const fakePolicyVersionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent policy_version_id should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.complianceConsents.create(
        connection,
        {
          body: {
            ...consentBody,
            policy_version_id: fakePolicyVersionId,
          } satisfies IHealthcarePlatformComplianceConsent.ICreate,
        },
      );
    },
  );
}
