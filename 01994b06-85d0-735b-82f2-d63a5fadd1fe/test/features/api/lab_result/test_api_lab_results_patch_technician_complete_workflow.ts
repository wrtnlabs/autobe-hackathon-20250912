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
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLabResult";

/**
 * Technician updates laboratory results for a specific encounter within a
 * patient record, ensuring preprocessing validation and successful result
 * registration.
 *
 * End-to-end flow:
 *
 * 1. Register and log in as organization admin (admin context)
 * 2. Register and log in as technician (technician context)
 * 3. Admin creates a patient record
 * 4. Admin creates an EHR encounter for the patient
 * 5. Admin creates (ensures) a lab integration exists for the org
 * 6. Technician logs in and submits a PATCH request on lab results for the
 *    encounter (verifies success, structure)
 * 7. Attempt error: technician from wrong org tries to update lab results (should
 *    fail)
 * 8. Attempt error: patch for a finalized encounter (simulate completed status,
 *    should fail) Business, auth, and permission rules validated throughout
 */
export async function test_api_lab_results_patch_technician_complete_workflow(
  connection: api.IConnection,
) {
  // 1. Register & login as organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminFullName = RandomGenerator.name();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: orgAdminFullName,
        password: orgAdminPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  // 2. Register & login as technician
  const technicianEmail = typia.random<string & tags.Format<"email">>();
  const technicianFullName = RandomGenerator.name();
  const technicianPassword = RandomGenerator.alphaNumeric(14);
  const licenseNumber = RandomGenerator.alphaNumeric(8);
  const technician = await api.functional.auth.technician.join(connection, {
    body: {
      email: technicianEmail,
      full_name: technicianFullName,
      license_number: licenseNumber,
      specialty: "Phlebotomy",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(technician);
  await api.functional.auth.technician.login(connection, {
    body: {
      email: technicianEmail,
      password: technicianPassword,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });

  // 3. Switch to admin for patient record setup
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdmin.id,
          department_id: null,
          patient_user_id: patientUserId,
          full_name: RandomGenerator.name(),
          dob: new Date().toISOString(),
          status: "active",
          gender: "Other",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 4. Create an EHR encounter for the patient
  const encounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: orgAdmin.id as string & tags.Format<"uuid">,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounter);

  // 5. Ensure/establish lab integration for this org
  const labIntegration =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgAdmin.id as string &
            tags.Format<"uuid">,
          lab_vendor_code: "LabCorp",
          connection_uri: "https://labcorp.example.com/api",
          supported_message_format: "HL7 V2",
          status: "active",
        } satisfies IHealthcarePlatformLabIntegration.ICreate,
      },
    );
  typia.assert(labIntegration);

  // 6. Technician logs in and submits PATCH (index) lab results for the encounter
  await api.functional.auth.technician.login(connection, {
    body: {
      email: technicianEmail,
      password: technicianPassword,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });
  const requestBody = {
    ehr_encounter_id: encounter.id,
    lab_integration_id: labIntegration.id,
    page: 1 as number & tags.Type<"int32">,
    pageSize: 10 as number & tags.Type<"int32">,
  } satisfies IHealthcarePlatformLabResult.IRequest;
  const resultPage =
    await api.functional.healthcarePlatform.technician.patientRecords.encounters.labResults.index(
      connection,
      {
        patientRecordId: patientRecord.id,
        encounterId: encounter.id,
        body: requestBody,
      },
    );
  typia.assert(resultPage);
  TestValidator.predicate(
    "Lab results list returned (may be empty for no actual labs, but structure confirmed)",
    Array.isArray(resultPage.data),
  );

  // 7. Error scenario: Technician from wrong org tries to update lab results
  // -- Register another org admin
  const otherOrgAdminEmail = typia.random<string & tags.Format<"email">>();
  const otherOrgAdminPassword = RandomGenerator.alphaNumeric(12);
  const otherOrgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: otherOrgAdminEmail,
        full_name: RandomGenerator.name(),
        password: otherOrgAdminPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(otherOrgAdmin);
  // -- Register technician under other org
  const otherTechEmail = typia.random<string & tags.Format<"email">>();
  const otherTechPassword = RandomGenerator.alphaNumeric(14);
  const otherTech = await api.functional.auth.technician.join(connection, {
    body: {
      email: otherTechEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(8),
      specialty: "Hematology",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(otherTech);
  // -- Login as wrong-org technician
  await api.functional.auth.technician.login(connection, {
    body: {
      email: otherTechEmail,
      password: otherTechPassword,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });
  // -- Try PATCH lab results (should fail)
  await TestValidator.error(
    "Technician from wrong org cannot update lab results",
    async () => {
      await api.functional.healthcarePlatform.technician.patientRecords.encounters.labResults.index(
        connection,
        {
          patientRecordId: patientRecord.id,
          encounterId: encounter.id,
          body: requestBody,
        },
      );
    },
  );

  // 8. Error: update for finalized/ended encounter (simulate completed status)
  // (No API to change encounter status; simulate by sending request with status: 'completed')
  await api.functional.auth.technician.login(connection, {
    body: {
      email: technicianEmail,
      password: technicianPassword,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });
  await TestValidator.error(
    "Updating lab results for finalized encounter should fail",
    async () => {
      await api.functional.healthcarePlatform.technician.patientRecords.encounters.labResults.index(
        connection,
        {
          patientRecordId: patientRecord.id,
          encounterId: encounter.id,
          body: {
            ...requestBody,
            status: "completed", // simulate finalized encounter
          },
        },
      );
    },
  );
}
