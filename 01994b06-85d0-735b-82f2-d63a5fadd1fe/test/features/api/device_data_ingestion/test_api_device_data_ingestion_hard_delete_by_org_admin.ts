import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDeviceDataIngestion";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate the hard deletion of a device data ingestion configuration by an
 * organization administrator.
 *
 * 1. Register as organization admin A and log in: receive org A admin session
 *    (token attached to connection).
 * 2. Register as organization admin B and log in: receive org B admin session
 *    (token attached after call, but B's token will be replaced).
 * 3. Log back in as admin A (to ensure A's token is loaded for creation).
 * 4. Admin A creates a device data ingestion config. Capture its id and the
 *    organization id from the returned object.
 * 5. Admin A performs a hard delete (erase) using the ingestion id. Ensure no
 *    error is thrown.
 * 6. Attempt to delete the same id again as admin A, expect failure
 *    (TestValidator.error, e.g. not found or deletion error).
 * 7. Attempt to delete a random non-existent id as admin A, expect failure.
 * 8. Log in as admin B. Attempt to delete admin A's item; expect permission or
 *    not found error (org isolation).
 * 9. [Audit log existence cannot be checked, so log in code comment.]
 * 10. [List query for ingestions is not available via current API surface;
 *     post-delete checks focus on error paths.]
 */
export async function test_api_device_data_ingestion_hard_delete_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Register admin A
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminAJoinBody = {
    email: adminAEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminA: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);
  const orgAId = adminA.id; // For deviceDataIngestion.ICreate

  // 2. Register admin B (other org)
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminBJoinBody = {
    email: adminBEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminB: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);
  const orgBId = adminB.id;

  // 3. Log back as admin A (to load A's token)
  await api.functional.auth.organizationAdmin.join(connection, {
    body: adminAJoinBody,
  });

  // 4. Admin A creates device data ingestion
  const ingestionCreateBody = {
    healthcare_platform_organization_id: orgAId,
    device_type: RandomGenerator.name(1),
    ingest_endpoint_uri:
      "https://devicestream.example.com/" + RandomGenerator.alphaNumeric(8),
    supported_protocol: RandomGenerator.pick([
      "HL7",
      "FHIR",
      "MQTT",
      "custom",
    ] as const),
    status: "ready",
  } satisfies IHealthcarePlatformDeviceDataIngestion.ICreate;
  const ingestion: IHealthcarePlatformDeviceDataIngestion =
    await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.create(
      connection,
      {
        body: ingestionCreateBody,
      },
    );
  typia.assert(ingestion);

  // 5. Admin A performs hard delete
  await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.erase(
    connection,
    {
      deviceDataIngestionId: ingestion.id,
    },
  );

  // 6. Attempt to delete same id again as admin A
  await TestValidator.error("repeat deletion fails (not found)", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.erase(
      connection,
      {
        deviceDataIngestionId: ingestion.id,
      },
    );
  });

  // 7. Attempt to delete a fake id as admin A
  await TestValidator.error("delete random id fails (not found)", async () => {
    // Random UUID guaranteed not to match previous id
    await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.erase(
      connection,
      {
        deviceDataIngestionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 8. Log in as admin B
  await api.functional.auth.organizationAdmin.join(connection, {
    body: adminBJoinBody,
  });
  // Try to delete A's ingestion (should be forbidden or not found)
  await TestValidator.error(
    "admin B cannot delete admin A's ingestion",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.erase(
        connection,
        {
          deviceDataIngestionId: ingestion.id,
        },
      );
    },
  );

  // 9. [Audit log verification is not possible via API]
  // 10. [List query not available, so no post-delete existence check other than above error paths]
}
