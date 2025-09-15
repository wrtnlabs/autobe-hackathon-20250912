import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLabResultImport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResultImport";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validates the detail retrieval of a single lab result import by
 * organization admin.
 *
 * This workflow covers:
 *
 * 1. Registering and authenticating a new organization admin
 * 2. (Simulated) Creating or preparing a lab result import (using typia.random
 *    for test purposes as no POST import endpoint is available)
 * 3. Authenticating the organization admin
 * 4. Fetching details for a valid labResultImportId using GET
 * 5. Validating that the returned record matches expected type and contains
 *    all mandatory fields
 * 6. Verifying access control: requesting a non-existent labResultImportId
 *    yields a proper error (404)
 */
export async function test_api_lab_result_import_detail_view_basic_success(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminFullName = RandomGenerator.name();

  const joinResult = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: adminFullName,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(joinResult);

  // 2. Simulate existence of a lab result import (no POST endpoint, so random)
  const labResultImport = typia.random<IHealthcarePlatformLabResultImport>();
  typia.assert(labResultImport);

  // 3. Re-authenticate admin to simulate fresh login session if needed
  const loginResult = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginResult);

  // 4. Get details for valid import (should succeed)
  const detail =
    await api.functional.healthcarePlatform.organizationAdmin.labResultImports.at(
      connection,
      {
        labResultImportId: labResultImport.id,
      },
    );
  typia.assert(detail);

  // 5. Validate some structural business logic (mandatory fields present, type matches, IDs consistent)
  TestValidator.equals(
    "returned lab result import id matches request",
    detail.id,
    labResultImport.id,
  );
  TestValidator.predicate(
    "organization id format (uuid)",
    typeof detail.healthcare_platform_organization_id === "string" &&
      detail.healthcare_platform_organization_id.length > 0,
  );
  TestValidator.predicate(
    "lab integration id format (uuid)",
    typeof detail.lab_integration_id === "string" &&
      detail.lab_integration_id.length > 0,
  );
  TestValidator.predicate(
    "parsed status present",
    typeof detail.parsed_status === "string",
  );
  TestValidator.predicate(
    "imported_at: valid date-time",
    typeof detail.imported_at === "string" && detail.imported_at.length > 0,
  );

  // 6. Edge case: request with non-existent labResultImportId
  await TestValidator.error(
    "404 is returned for a non-existent labResultImportId",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.labResultImports.at(
        connection,
        {
          labResultImportId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
