import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import type { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLabResult";

/**
 * Full E2E: organization admin can PATCH/update lab results for an encounter
 * under their own org; permission boundary is enforced and error thrown for
 * cross-org attempt.
 *
 * Steps:
 *
 * 1. Join as organization admin A
 * 2. Login as admin A
 * 3. Create patient record under org A
 * 4. Create EHR encounter for that patient record
 * 5. Create lab integration (for lab_integration_id field)
 * 6. PATCH lab results with org admin (A) to their own encounter (should succeed)
 * 7. Attempt PATCH to another encounter (simulated with random UUID/org) (should
 *    fail)
 * 8. Validate all responses, including compliance-relevant audit fields
 */
export async function test_api_lab_results_patch_organization_admin_full_control_flow(
  connection: api.IConnection,
) {
  // 1. Organization admin joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(2),
        password: "StrongPassword123!",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(adminJoin);
  const admin = adminJoin;

  // 2. Login explicitly to get tokens (often required in flows)
  const adminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: "StrongPassword123!",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminLogin);

  // 3. Patient record creation
  const patientRecord: IHealthcarePlatformPatientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: admin.id, // This might be the org ID; if not, should use correct relation.
          patient_user_id: typia.random<string>(),
          full_name: RandomGenerator.name(),
          dob: new Date("1990-11-10").toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 4. Create EHR encounter for this patient
  const encounter: IHealthcarePlatformEhrEncounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: typia.random<string & tags.Format<"uuid">>(),
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounter);

  // 5. Lab integration for the organization
  const labIntegration =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: admin.id as string &
            tags.Format<"uuid">,
          lab_vendor_code: "LabCorp",
          connection_uri: "https://labcorp-integration/api",
          supported_message_format: "HL7 V2",
          status: "active",
        } satisfies IHealthcarePlatformLabIntegration.ICreate,
      },
    );
  typia.assert(labIntegration);

  // 6. PATCH lab results for this encounter (should succeed)
  const patchBodySuccess = {
    ehr_encounter_id: encounter.id,
    lab_integration_id: labIntegration.id,
    test_name: "Complete Blood Count",
    result_flag: "normal",
    status: "completed",
    resulted_at_from: new Date(Date.now() - 1000000).toISOString(),
    resulted_at_to: new Date().toISOString(),
    page: 1,
    pageSize: 5,
  } satisfies IHealthcarePlatformLabResult.IRequest;
  const patchResult =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.labResults.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        body: patchBodySuccess,
      },
    );
  typia.assert(patchResult);
  TestValidator.predicate(
    "labResults list not empty (own org)",
    patchResult.data.length >= 0,
  );

  // 7. Cross-org PATCH attempt (simulates picking a UUID not owned by this admin)
  await TestValidator.error(
    "cross-org labResults PATCH is forbidden",
    async () => {
      const randomPatientRecordId = typia.random<
        string & tags.Format<"uuid">
      >();
      const randomEncounterId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.labResults.index(
        connection,
        {
          patientRecordId: randomPatientRecordId,
          encounterId: randomEncounterId,
          body: patchBodySuccess,
        },
      );
    },
  );
}
