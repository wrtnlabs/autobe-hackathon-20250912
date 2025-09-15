import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate end-to-end workflow for org admin creating a new lab integration
 * including setup, business validation, negative paths, and access
 * control.
 *
 * 1. Register and log in as org admin.
 * 2. Prepare valid integration input for the admin's assigned organization.
 * 3. Create a new lab integration and verify correct record structure and
 *    content.
 * 4. Validate required field enforcement and uniqueness (duplicate
 *    lab_vendor_code must fail for same org).
 * 5. Check access control: unauthenticated or wrong role (non-admin) cannot
 *    create integrations.
 * 6. Confirm type, format, and business rules in responses.
 * 7. If available, verify audit log for creation event.
 */
export async function test_api_lab_integration_creation_by_orgadmin_workflow_validation(
  connection: api.IConnection,
) {
  // 1. Register admin and log in
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    password: "TestPassword123!",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminSession = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: adminJoinBody },
  );
  typia.assert(adminSession);
  const orgAdmin = adminSession;

  // 2. Prepare integration input for this admin's org
  const integrationInput = {
    healthcare_platform_organization_id: orgAdmin.id as string &
      tags.Format<"uuid">, // (Assume orgAdmin.id is the org id; adjust based on real API if needed)
    lab_vendor_code: RandomGenerator.alphabets(8),
    connection_uri: `https://lab-${RandomGenerator.alphabets(6)}.example.com/api`,
    supported_message_format: RandomGenerator.pick([
      "HL7 V2",
      "FHIR R4",
      "C-CDA",
    ] as const),
    status: "active",
  } satisfies IHealthcarePlatformLabIntegration.ICreate;

  // 3. Create lab integration as admin, assert response structure
  const created =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
      connection,
      {
        body: integrationInput,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "integration org matches admin id",
    created.healthcare_platform_organization_id,
    integrationInput.healthcare_platform_organization_id,
  );
  TestValidator.equals(
    "provider code matches",
    created.lab_vendor_code,
    integrationInput.lab_vendor_code,
  );
  TestValidator.equals(
    "connection URI matches",
    created.connection_uri,
    integrationInput.connection_uri,
  );
  TestValidator.equals(
    "status matches",
    created.status,
    integrationInput.status,
  );

  // 4. Duplicate integration for the same organization/provider code must fail
  await TestValidator.error(
    "duplicate provider code must be rejected",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
        connection,
        {
          body: integrationInput,
        },
      );
    },
  );

  // 5. Required field enforcement: omit required field, must fail
  const missingField: Partial<IHealthcarePlatformLabIntegration.ICreate> = {
    ...integrationInput,
  };
  delete (missingField as any)["connection_uri"];
  await TestValidator.error(
    "missing required connection_uri field must be rejected",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
        connection,
        {
          body: missingField as IHealthcarePlatformLabIntegration.ICreate,
        },
      );
    },
  );

  // 6. Access control: unauthenticated connection (empty headers) must fail
  const freshConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated user is denied", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
      freshConn,
      {
        body: integrationInput,
      },
    );
  });

  // TODO: If non-admin roles exist, test creation attempt as such a user
  // Skipped here as no API for other roles given
  // If audit log API available, check for relevant entry (skipped: API not available in this context)
}
