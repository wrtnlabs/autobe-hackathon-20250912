import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * End-to-end test for updating a lab integration as org admin, covering full
 * dependency chain.
 *
 * 1. Register organization admin
 * 2. Login as admin, retrieve token
 * 3. Create lab integration (get labIntegrationId)
 * 4. Update lab integration (change connection_uri, message format, status) via
 *    PUT
 * 5. Validate update reflects modified fields
 * 6. Test business constraints for allowed/unique fields
 * 7. Test RBAC: update forbidden for not-logged-in users
 * 8. (Audit log validation acknowledged in comment only)
 */
export async function test_api_lab_integration_update_by_orgadmin_with_full_dependency_chain(
  connection: api.IConnection,
) {
  // 1. Organization admin joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinRes = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        password: "pass1234",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoinRes);

  // 2. Admin logs in to obtain auth token
  const adminLoginRes = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: "pass1234",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminLoginRes);

  // 3. Create new labIntegration for testing update
  const createLabIntegrationBody = {
    healthcare_platform_organization_id: adminLoginRes.id,
    lab_vendor_code: RandomGenerator.alphaNumeric(8),
    connection_uri:
      "https://labs.example.com/api/v1/abc" + RandomGenerator.alphaNumeric(4),
    supported_message_format: RandomGenerator.pick([
      "HL7 V2",
      "FHIR R4",
      "C-CDA",
    ] as const),
    status: RandomGenerator.pick(["active", "pending", "disabled"] as const),
  } satisfies IHealthcarePlatformLabIntegration.ICreate;
  const labIntegration =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
      connection,
      {
        body: createLabIntegrationBody,
      },
    );
  typia.assert(labIntegration);

  // 4. Update the lab integration: change connection_uri, message format & status
  const updateBody = {
    connection_uri:
      "https://labs.example.com/api/v1/updated" +
      RandomGenerator.alphaNumeric(5),
    supported_message_format: RandomGenerator.pick([
      "HL7 V2",
      "FHIR R4",
      "C-CDA",
    ] as const),
    status: RandomGenerator.pick(["active", "pending", "disabled"] as const),
  } satisfies IHealthcarePlatformLabIntegration.IUpdate;
  const updatedIntegration =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.update(
      connection,
      {
        labIntegrationId: labIntegration.id,
        body: updateBody,
      },
    );
  typia.assert(updatedIntegration);

  // 5. Validate updated fields are reflected; unmodified fields unchanged
  TestValidator.equals(
    "updated connection_uri",
    updatedIntegration.connection_uri,
    updateBody.connection_uri,
  );
  TestValidator.equals(
    "updated supported_message_format",
    updatedIntegration.supported_message_format,
    updateBody.supported_message_format,
  );
  TestValidator.equals(
    "updated status",
    updatedIntegration.status,
    updateBody.status,
  );
  TestValidator.equals(
    "lab_vendor_code should not change",
    updatedIntegration.lab_vendor_code,
    labIntegration.lab_vendor_code,
  );
  TestValidator.equals(
    "healthcare_platform_organization_id should not change",
    updatedIntegration.healthcare_platform_organization_id,
    labIntegration.healthcare_platform_organization_id,
  );
  TestValidator.notEquals(
    "updated_at is changed after update",
    updatedIntegration.updated_at,
    labIntegration.updated_at,
  );

  // 6. Business logic tests: uniqueness - try to update vendor_code illegally
  await TestValidator.error(
    "cannot update lab_vendor_code to existing code",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.update(
        connection,
        {
          labIntegrationId: labIntegration.id,
          body: {
            lab_vendor_code: createLabIntegrationBody.lab_vendor_code, // same as before, should trigger uniqueness if enforced
          } satisfies IHealthcarePlatformLabIntegration.IUpdate,
        },
      );
    },
  );

  // 7. Test RBAC: unauth user should get error updating
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized update fails", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.update(
      unauthConn,
      {
        labIntegrationId: labIntegration.id,
        body: updateBody,
      },
    );
  });

  // 8. (Audit log validation acknowledged, but no API to fetch logs)
}
