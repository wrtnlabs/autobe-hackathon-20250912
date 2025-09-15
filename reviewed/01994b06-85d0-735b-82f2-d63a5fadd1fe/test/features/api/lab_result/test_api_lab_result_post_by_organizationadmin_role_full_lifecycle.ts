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

/**
 * End-to-end test for posting a lab result by an organization admin user,
 * validating business workflows, linkage, cross-entity validation and
 * audit/compliance output for lab result lifecycles.
 *
 * 1. Register and login as systemAdmin
 * 2. SystemAdmin creates a new organization (unique code & name)
 * 3. Register and login as organizationAdmin
 * 4. OrganizationAdmin creates a patient record (mock patient_user_id)
 * 5. OrganizationAdmin creates an EHR encounter for that patient record
 * 6. OrganizationAdmin creates a lab integration for the organization
 * 7. OrganizationAdmin posts a lab result for the encounter via the target
 *    endpoint
 * 8. Check that response contains correct linkage/IDs
 * 9. Error paths: posting with non-existent IDs or mislinked
 *    organization/encounter IDs is rejected
 */
export async function test_api_lab_result_post_by_organizationadmin_role_full_lifecycle(
  connection: api.IConnection,
) {
  // Register as systemAdmin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(10);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  typia.assert(sysAdmin);

  // Login as systemAdmin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });

  // Create organization (by systemAdmin)
  const orgCode = RandomGenerator.alphaNumeric(12);
  const orgName = RandomGenerator.name();
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: orgName,
          status: "active",
        },
      },
    );
  typia.assert(organization);

  // Register organizationAdmin for that org
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail,
      },
    },
  );
  typia.assert(orgAdmin);

  // Login as organizationAdmin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    },
  });

  // Create a patient record (using random patient_user_id)
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: organization.id,
          patient_user_id: patientUserId,
          full_name: RandomGenerator.name(),
          dob: new Date().toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(patientRecord);

  // Create encounter for that patient record, orgAdmin assigned as provider
  const encounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: orgAdmin.id as string & tags.Format<"uuid">,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(encounter);

  // Create a lab integration for the org
  const labIntegration =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id as string &
            tags.Format<"uuid">,
          lab_vendor_code: "labcorp",
          connection_uri: "https://api.labcorp.example/v1/endpoint",
          supported_message_format: "HL7 V2",
          status: "active",
        },
      },
    );
  typia.assert(labIntegration);

  // Post lab result for the encounter
  const labResult =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.labResults.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        body: {
          ehr_encounter_id: encounter.id as string & tags.Format<"uuid">,
          lab_integration_id: labIntegration.id as string & tags.Format<"uuid">,
          test_name: "CBC",
          test_result_value_json: JSON.stringify({
            HGB: 14.2,
            HCT: 40,
            WBC: 8500,
          }),
          result_flag: "normal",
          resulted_at: new Date().toISOString(),
          status: "completed",
        },
      },
    );
  typia.assert(labResult);

  // Confirm linkage is correct
  TestValidator.equals(
    "lab result: encounter id linkage",
    labResult.ehr_encounter_id,
    encounter.id,
  );
  TestValidator.equals(
    "lab result: lab integration linkage",
    labResult.lab_integration_id,
    labIntegration.id,
  );

  // Error scenario: try to post lab result with wrong encounter id (should fail)
  const wrongEncounterId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail when encounter id does not exist",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.labResults.create(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: wrongEncounterId,
          body: {
            ehr_encounter_id: wrongEncounterId,
            lab_integration_id: labIntegration.id as string &
              tags.Format<"uuid">,
            test_name: "CBC",
            test_result_value_json: JSON.stringify({ HGB: 13.5 }),
            result_flag: "abnormal",
            resulted_at: new Date().toISOString(),
            status: "completed",
          },
        },
      );
    },
  );

  // Error scenario: try to post with mismatched patient record/encounter
  const otherPatientRecordId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail with mismatched patient record and encounter",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.labResults.create(
        connection,
        {
          patientRecordId: otherPatientRecordId,
          encounterId: encounter.id as string & tags.Format<"uuid">,
          body: {
            ehr_encounter_id: encounter.id as string & tags.Format<"uuid">,
            lab_integration_id: labIntegration.id as string &
              tags.Format<"uuid">,
            test_name: "CBC",
            test_result_value_json: JSON.stringify({ HGB: 13.7 }),
            result_flag: "normal",
            resulted_at: new Date().toISOString(),
            status: "completed",
          },
        },
      );
    },
  );
}
