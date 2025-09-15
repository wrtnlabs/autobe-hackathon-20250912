import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import type { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate workflow for Department Head lab result submission and access
 * control.
 *
 * 1. System admin registers and logs in
 * 2. System admin creates an organization
 * 3. Organization admin registers and logs in
 * 4. Organization admin creates a patient record
 * 5. Organization admin creates an encounter
 * 6. Organization admin creates a lab integration
 * 7. Department head registers and logs in
 * 8. Department head submits a valid lab result for the created encounter and
 *    patient record
 * 9. Validates proper linkage and response
 * 10. Tests edge cases: (error on invalid encounter or lab integration IDs)
 */
export async function test_api_lab_result_submission_by_departmenthead_edge_validation_and_success(
  connection: api.IConnection,
) {
  // 1. System admin register
  const sysAdminEmail = RandomGenerator.alphaNumeric(12) + "@company.com";
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "SecureP@ssw0rd",
    },
  });
  typia.assert(sysAdminJoin);

  // 2. System admin login
  const sysAdminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: sysAdminEmail,
        provider: "local",
        provider_key: sysAdminEmail,
        password: "SecureP@ssw0rd",
      },
    },
  );
  typia.assert(sysAdminLogin);

  // 3. System admin creates organization
  const orgBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: orgBody,
      },
    );
  typia.assert(org);

  // 4. Organization admin register
  const orgAdminEmail = RandomGenerator.alphaNumeric(12) + "@company.com";
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: "OrgAdminP@ss1",
      },
    },
  );
  typia.assert(orgAdminJoin);

  // 5. Organization admin login
  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: "OrgAdminP@ss1",
      },
    },
  );
  typia.assert(orgAdminLogin);

  // 6. Organization admin creates patient record
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const patientRecordBody = {
    organization_id: org.id,
    patient_user_id: patientUserId,
    full_name: RandomGenerator.name(),
    dob: new Date(Date.now() - 30 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 30 years old
    status: "active",
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: patientRecordBody,
      },
    );
  typia.assert(patientRecord);

  // 7. Organization admin creates an encounter
  const encounterBody = {
    patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
    provider_user_id: typia.random<string & tags.Format<"uuid">>(),
    encounter_type: "office_visit",
    encounter_start_at: new Date().toISOString(),
    status: "active",
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;
  const encounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: encounterBody,
      },
    );
  typia.assert(encounter);

  // 8. Organization admin creates a lab integration
  const labIntegrationBody = {
    healthcare_platform_organization_id: org.id as string & tags.Format<"uuid">,
    lab_vendor_code: RandomGenerator.name(1),
    connection_uri: `https://labapi.${RandomGenerator.alphaNumeric(6)}.com/v1`,
    supported_message_format: "HL7 V2",
    status: "active",
  } satisfies IHealthcarePlatformLabIntegration.ICreate;
  const labIntegration =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
      connection,
      {
        body: labIntegrationBody,
      },
    );
  typia.assert(labIntegration);

  // 9. Department head register
  const deptHeadEmail = RandomGenerator.alphaNumeric(12) + "@company.com";
  const deptHeadJoin = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: deptHeadEmail,
        full_name: RandomGenerator.name(),
        password: "DeptH3adP@ss!",
      },
    },
  );
  typia.assert(deptHeadJoin);

  // 10. Department head login
  const deptHeadLogin = await api.functional.auth.departmentHead.login(
    connection,
    {
      body: {
        email: deptHeadEmail,
        password: "DeptH3adP@ss!",
      },
    },
  );
  typia.assert(deptHeadLogin);

  // 11. Department head posts a valid lab result for the encounter
  const labResultBody = {
    ehr_encounter_id: encounter.id,
    lab_integration_id: labIntegration.id,
    test_name: RandomGenerator.paragraph({ sentences: 2 }),
    test_result_value_json: JSON.stringify({
      result: RandomGenerator.paragraph(),
    }),
    result_flag: RandomGenerator.pick([
      "normal",
      "abnormal",
      "critical",
      "corrected",
    ] as const),
    resulted_at: new Date().toISOString(),
    status: "completed",
  } satisfies IHealthcarePlatformLabResult.ICreate;
  const labResult =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.labResults.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        body: labResultBody,
      },
    );
  typia.assert(labResult);

  // Validate lab result linkage and response
  TestValidator.equals(
    "lab result encounter linkage",
    labResult.ehr_encounter_id,
    encounter.id,
  );
  TestValidator.equals(
    "lab result lab integration linkage",
    labResult.lab_integration_id,
    labIntegration.id,
  );
  TestValidator.equals("lab result status", labResult.status, "completed");

  // Edge Case: Error - invalid encounterId
  await TestValidator.error("invalid encounterId should fail", async () => {
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.labResults.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: typia.random<string & tags.Format<"uuid">>(),
        body: labResultBody,
      },
    );
  });

  // Edge Case: Error - invalid lab integration ID
  await TestValidator.error(
    "invalid lab integration ID should fail",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.labResults.create(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id as string & tags.Format<"uuid">,
          body: {
            ...labResultBody,
            lab_integration_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
}
