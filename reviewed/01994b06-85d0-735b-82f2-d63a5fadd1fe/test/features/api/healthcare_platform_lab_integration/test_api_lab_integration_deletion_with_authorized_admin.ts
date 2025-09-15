import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Verify deletion (soft-delete) of a laboratory integration by authorized
 * admin.
 *
 * - Confirm organization admin can delete their org's lab integration.
 * - Setup: Join as organization admin and create a lab integration for that
 *   org.
 * - Delete lab integration: POST
 *   /healthcarePlatform/organizationAdmin/labIntegrations/:labIntegrationId
 * - Validate: (a) operation succeeds (204/void); (b) subsequent delete
 *   attempts result in error; (c) different org's admin cannot delete it
 *   (permission boundary).
 * - Skips deleted_at and listing validation (no get/list endpoint provided).
 */
export async function test_api_lab_integration_deletion_with_authorized_admin(
  connection: api.IConnection,
) {
  // 1. Register and join as organization admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Create a lab integration as the admin
  const labIntegrationBody = {
    healthcare_platform_organization_id: admin.id as string &
      tags.Format<"uuid">,
    lab_vendor_code: RandomGenerator.alphabets(10),
    connection_uri: "https://lab-provider.example.com/api",
    supported_message_format: RandomGenerator.pick([
      "HL7 V2",
      "FHIR R4",
      "C-CDA",
    ] as const),
    status: "active",
  } satisfies IHealthcarePlatformLabIntegration.ICreate;
  const integration =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
      connection,
      {
        body: labIntegrationBody,
      },
    );
  typia.assert(integration);

  // 3. Delete the integration
  await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.erase(
    connection,
    {
      labIntegrationId: integration.id,
    },
  );

  // 4. Attempt deleting again, expect error
  await TestValidator.error(
    "deleting an already deleted integration should trigger error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.erase(
        connection,
        {
          labIntegrationId: integration.id,
        },
      );
    },
  );

  // 5. Register another admin from a different org, try unauthorized deletion (permission boundary)
  const joinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin2 = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody2,
  });
  typia.assert(admin2);

  await TestValidator.error(
    "admin from another org cannot delete integration",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.erase(
        connection,
        {
          labIntegrationId: integration.id,
        },
      );
    },
  );
}
