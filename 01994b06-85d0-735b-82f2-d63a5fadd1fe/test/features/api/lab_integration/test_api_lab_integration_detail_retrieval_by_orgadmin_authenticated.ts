import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Retrieve a lab integration configuration as an authenticated organization
 * admin.
 *
 * This test covers:
 *
 * 1. Registering a new organization admin
 * 2. Logging in as the org admin
 * 3. Creating a new lab integration (using org-admin's org id)
 * 4. Retrieving the lab integration detail using the newly created id
 * 5. Validation: Confirm the returned data matches the inserted data
 * 6. Error - unauthenticated request: Access is denied
 */
export async function test_api_lab_integration_detail_retrieval_by_orgadmin_authenticated(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(10),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: joinInput,
    },
  );
  typia.assert(adminAuth);

  // 2. Login as organization admin (simulate fresh login context)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: joinInput.email,
      password: joinInput.password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Create a new lab integration for the admin's org
  const labIntegrationCreate = {
    healthcare_platform_organization_id: adminAuth.id,
    lab_vendor_code: RandomGenerator.alphabets(6),
    connection_uri: `https://lab-${RandomGenerator.alphabets(10)}.example.com/api`,
    supported_message_format: RandomGenerator.pick([
      "HL7 V2",
      "FHIR R4",
      "C-CDA",
    ] as const),
    status: RandomGenerator.pick(["active", "pending", "disabled"] as const),
  } satisfies IHealthcarePlatformLabIntegration.ICreate;
  const createdLabIntegration =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
      connection,
      { body: labIntegrationCreate },
    );
  typia.assert(createdLabIntegration);

  // 4. Retrieve the lab integration detail by id as org admin
  const labIntegrationDetail =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.at(
      connection,
      { labIntegrationId: createdLabIntegration.id },
    );
  typia.assert(labIntegrationDetail);

  // 5. Validate that returned config matches inserted config (org, vendor etc)
  TestValidator.equals(
    "organization id matches",
    labIntegrationDetail.healthcare_platform_organization_id,
    labIntegrationCreate.healthcare_platform_organization_id,
  );
  TestValidator.equals(
    "vendor code matches",
    labIntegrationDetail.lab_vendor_code,
    labIntegrationCreate.lab_vendor_code,
  );
  TestValidator.equals(
    "connection URI matches",
    labIntegrationDetail.connection_uri,
    labIntegrationCreate.connection_uri,
  );
  TestValidator.equals(
    "supported message format matches",
    labIntegrationDetail.supported_message_format,
    labIntegrationCreate.supported_message_format,
  );
  TestValidator.equals(
    "status matches",
    labIntegrationDetail.status,
    labIntegrationCreate.status,
  );

  // 6. Attempt unauthenticated request: expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to lab integration detail is denied",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.at(
        unauthConn,
        { labIntegrationId: createdLabIntegration.id },
      );
    },
  );
}
