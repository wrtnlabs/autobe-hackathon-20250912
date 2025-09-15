import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import type { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Validate the end-to-end process of lab result creation via technician for
 * a patient encounter.
 *
 * 1. Register and login as technician
 * 2. Register and login as system admin
 * 3. Register and login as organization admin
 * 4. System admin creates an organization
 * 5. Organization admin creates a patient record
 * 6. Organization admin creates an EHR encounter for the patient
 * 7. Organization admin registers a lab integration
 * 8. Technician logs in (again, if session is required for role switching)
 * 9. Technician creates a lab result for the encounter, referencing the
 *    integration
 * 10. Validate that the created lab result matches input and references, and is
 *     correctly linked in the system
 */
export async function test_api_lab_result_creation_from_technician_valid_flow(
  connection: api.IConnection,
) {
  // 1. Register & login as technician
  const techEmail = typia.random<string & tags.Format<"email">>();
  const techPassword = RandomGenerator.alphaNumeric(12);
  const technicianJoin = await api.functional.auth.technician.join(connection, {
    body: {
      email: techEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(10),
      specialty: RandomGenerator.pick([
        "Lab",
        "Pathology",
        "Radiology",
      ] as const),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(technicianJoin);

  await api.functional.auth.technician.login(connection, {
    body: {
      email: techEmail,
      password: techPassword as string & tags.MinLength<8>,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });

  // 2. Register & login as system admin
  const sysEmail = typia.random<string & tags.Format<"email">>();
  const sysFullName = RandomGenerator.name();
  const sysPassword = RandomGenerator.alphaNumeric(16);
  const systemAdminJoin = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: {
        email: sysEmail,
        full_name: sysFullName,
        provider: "local",
        provider_key: sysEmail,
        password: sysPassword,
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    },
  );
  typia.assert(systemAdminJoin);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysEmail,
      provider: "local",
      provider_key: sysEmail,
      password: sysPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 3. Register & login as organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(14) as string &
    tags.MinLength<8>;
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. System admin creates organization
  const orgCode = RandomGenerator.alphaNumeric(8);
  const orgName = RandomGenerator.name(3);
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: orgName,
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(org);

  // 5. Organization admin creates patient record
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: org.id,
          patient_user_id: patientUserId,
          full_name: RandomGenerator.name(),
          dob: new Date(1990, 0, 1).toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 6. Organization admin creates encounter
  const providerUserId = typia.random<string & tags.Format<"uuid">>();
  const encounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: providerUserId,
          encounter_type: RandomGenerator.pick([
            "office_visit",
            "emergency",
            "admission",
            "telemedicine",
          ] as const),
          encounter_start_at: new Date().toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounter);

  // 7. Organization admin registers a lab integration
  const labIntegration =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id as string &
            tags.Format<"uuid">,
          lab_vendor_code: RandomGenerator.pick([
            "LabCorp",
            "Quest",
            "LocalLab",
          ] as const),
          connection_uri: `https://lab-${org.code}.vendor.com/api`,
          supported_message_format: RandomGenerator.pick([
            "HL7 V2",
            "FHIR R4",
            "C-CDA",
          ] as const),
          status: "active",
        } satisfies IHealthcarePlatformLabIntegration.ICreate,
      },
    );
  typia.assert(labIntegration);

  // 8. Technician logs in for current session
  await api.functional.auth.technician.login(connection, {
    body: {
      email: techEmail,
      password: techPassword as string & tags.MinLength<8>,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });

  // 9. Technician creates a lab result
  const test_result_values = {
    WBC: 5.2,
    RBC: 4.7,
    HGB: 14.1,
    Platelets: 250,
  };
  const labResultBody = {
    ehr_encounter_id: encounter.id,
    lab_integration_id: labIntegration.id,
    test_name: "CBC",
    test_result_value_json: JSON.stringify(test_result_values),
    result_flag: "normal",
    resulted_at: new Date().toISOString(),
    status: "completed",
  } satisfies IHealthcarePlatformLabResult.ICreate;

  const labResult =
    await api.functional.healthcarePlatform.technician.patientRecords.encounters.labResults.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        encounterId: encounter.id,
        body: labResultBody,
      },
    );
  typia.assert(labResult);

  // 10. Validate created lab result matches input, including linkage & values
  TestValidator.equals(
    "lab result encounter reference matches",
    labResult.ehr_encounter_id,
    encounter.id,
  );
  TestValidator.equals(
    "lab result integration reference matches",
    labResult.lab_integration_id,
    labIntegration.id,
  );
  TestValidator.equals(
    "lab result test_name matches input",
    labResult.test_name,
    labResultBody.test_name,
  );
  TestValidator.equals(
    "lab result result_flag matches input",
    labResult.result_flag,
    labResultBody.result_flag,
  );
  TestValidator.equals(
    "lab result status matches input",
    labResult.status,
    labResultBody.status,
  );
  TestValidator.equals(
    "lab result test_result_value_json matches input",
    labResult.test_result_value_json,
    labResultBody.test_result_value_json,
  );
}
