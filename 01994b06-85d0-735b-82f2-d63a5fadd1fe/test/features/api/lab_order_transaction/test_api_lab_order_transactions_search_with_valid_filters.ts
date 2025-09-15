import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import type { IHealthcarePlatformLabOrderTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabOrderTransaction";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformLabOrderTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLabOrderTransaction";

/**
 * Validate lab order transaction search with valid filters, authentication, and
 * error cases.
 *
 * 1. Register and authenticate an organization admin
 * 2. Create a lab integration for the organization
 * 3. Issue a search for lab order transactions using valid organizationId &
 *    labIntegrationId (success case)
 * 4. Search with invalid organizationId or labIntegrationId (expect empty or error
 *    result)
 * 5. Attempt search without authentication (should be rejected)
 * 6. Assert output structure, pagination, and audit/created fields
 */
export async function test_api_lab_order_transactions_search_with_valid_filters(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an organization admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: "admin-password-1234",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;

  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a lab integration for this admin's organization
  const integrationBody = {
    healthcare_platform_organization_id: admin.id,
    lab_vendor_code: RandomGenerator.paragraph({ sentences: 2 }),
    connection_uri:
      `https://${RandomGenerator.alphaNumeric(10)}.lab.test` as string,
    supported_message_format: RandomGenerator.pick([
      "HL7 V2",
      "FHIR R4",
      "C-CDA",
    ] as const),
    status: RandomGenerator.pick(["active", "pending", "disabled"] as const),
  } satisfies IHealthcarePlatformLabIntegration.ICreate;

  const integration: IHealthcarePlatformLabIntegration =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
      connection,
      { body: integrationBody },
    );
  typia.assert(integration);

  // 3. Search with valid organizationId and labIntegrationId
  const searchBody = {
    organizationId: integration.healthcare_platform_organization_id,
    labIntegrationId: integration.id,
    page: 1,
    pageSize: 20,
  } satisfies IHealthcarePlatformLabOrderTransaction.IRequest;

  const page: IPageIHealthcarePlatformLabOrderTransaction =
    await api.functional.healthcarePlatform.organizationAdmin.labOrderTransactions.index(
      connection,
      { body: searchBody },
    );
  typia.assert(page);
  TestValidator.predicate(
    "pagination structure is valid",
    page.pagination.current === 1 && typeof page.pagination.limit === "number",
  );
  TestValidator.predicate(
    "all returned lab order transactions match the org & integration filters",
    page.data.every(
      (tx) =>
        tx.healthcare_platform_organization_id ===
          integration.healthcare_platform_organization_id &&
        tx.lab_integration_id === integration.id,
    ),
  );
  // 4. Search with invalid organizationId (should yield empty result)
  const outOrgId = typia.random<string & tags.Format<"uuid">>();
  const pageInvalidOrg =
    await api.functional.healthcarePlatform.organizationAdmin.labOrderTransactions.index(
      connection,
      {
        body: {
          organizationId: outOrgId,
          labIntegrationId: integration.id,
          page: 1,
          pageSize: 10,
        },
      },
    );
  typia.assert(pageInvalidOrg);
  TestValidator.equals(
    "invalid organizationId returns empty data",
    pageInvalidOrg.data,
    [],
  );

  // 5. Search with invalid labIntegrationId (should yield empty result)
  const outLabIntegrationId = typia.random<string & tags.Format<"uuid">>();
  const pageInvalidLabId =
    await api.functional.healthcarePlatform.organizationAdmin.labOrderTransactions.index(
      connection,
      {
        body: {
          organizationId: integration.healthcare_platform_organization_id,
          labIntegrationId: outLabIntegrationId,
          page: 1,
          pageSize: 10,
        },
      },
    );
  typia.assert(pageInvalidLabId);
  TestValidator.equals(
    "invalid labIntegrationId returns empty data",
    pageInvalidLabId.data,
    [],
  );

  // 6. Attempt search without authentication (simulate unauthenticated context)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access should be rejected",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.labOrderTransactions.index(
        unauthConn,
        { body: searchBody },
      );
    },
  );
}
