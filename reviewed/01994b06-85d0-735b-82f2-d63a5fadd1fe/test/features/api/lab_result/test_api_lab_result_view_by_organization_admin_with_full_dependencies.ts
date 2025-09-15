import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate end-to-end retrieval of lab result details by organization admin,
 * ensuring full dependency chain:
 *
 * 1. System admin onboarding and login,
 * 2. Organization creation,
 * 3. Organization admin onboarding and login,
 * 4. Organization department creation,
 * 5. Patient record creation,
 * 6. Encounter creation,
 * 7. Lab result creation,
 * 8. Lab result retrieval as organization admin Also validates error scenarios:
 *    missing or cross-org access.
 */
export async function test_api_lab_result_view_by_organization_admin_with_full_dependencies(
  connection: api.IConnection,
) {
  // 1. System admin onboard and login
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "sysadminpw",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: "sysadminpw",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 2. Create organization
  const orgCode = RandomGenerator.alphaNumeric(8);
  const orgName = RandomGenerator.paragraph({ sentences: 2 });
  const orgStatus = "active";
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: orgName,
          status: orgStatus,
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(org);
  const orgId = org.id;

  // 3. Organization admin onboard and login
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: "orgadminpw",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "orgadminpw",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. Department Creation
  const dept =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: orgId,
        body: {
          healthcare_platform_organization_id: orgId,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IHealthcarePlatformDepartment.ICreate,
      },
    );
  typia.assert(dept);

  // 5. Patient record registration
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgId,
          department_id: dept.id,
          patient_user_id: patientUserId,
          full_name: RandomGenerator.name(),
          dob: new Date(1990, 0, 1).toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);
  const patientRecordId = patientRecord.id;

  // 6. Encounter scheduling
  const providerUserId = typia.random<string & tags.Format<"uuid">>();
  const encounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecordId,
        body: {
          patient_record_id: patientRecordId as string & tags.Format<"uuid">,
          provider_user_id: providerUserId,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounter);
  const encounterId = encounter.id;

  // 7. Lab Result Creation
  const labIntegrationId = typia.random<string & tags.Format<"uuid">>();
  const testName = "CBC";
  const labJSON = JSON.stringify({ WBC: 4.7, RBC: 5.0 });
  const resultFlag = "normal";
  const resultedAt = new Date().toISOString();
  const labStatus = "completed";
  const labResult =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.labResults.create(
      connection,
      {
        patientRecordId,
        encounterId,
        body: {
          ehr_encounter_id: encounterId,
          lab_integration_id: labIntegrationId,
          test_name: testName,
          test_result_value_json: labJSON,
          result_flag: resultFlag,
          resulted_at: resultedAt,
          status: labStatus,
        } satisfies IHealthcarePlatformLabResult.ICreate,
      },
    );
  typia.assert(labResult);
  const labResultId = labResult.id;

  // 8. Lab Result Retrieval
  const fetched =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.labResults.at(
      connection,
      {
        patientRecordId,
        encounterId,
        labResultId,
      },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "Lab result data matches created record",
    fetched,
    labResult,
  );

  // Negative: try to fetch a non-existent lab result
  await TestValidator.error(
    "Accessing non-existent lab result must fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.labResults.at(
        connection,
        {
          patientRecordId,
          encounterId,
          labResultId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Negative: simulate cross-org access (create a different org and lab result, try to fetch from main org)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: "sysadminpw",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  const otherOrg =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(otherOrg);
  const otherOrgId = otherOrg.id;

  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      full_name: RandomGenerator.name(),
      password: "otheradminpw",
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  const otherDept =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: otherOrgId,
        body: {
          healthcare_platform_organization_id: otherOrgId,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IHealthcarePlatformDepartment.ICreate,
      },
    );
  const otherPatientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: otherOrgId,
          department_id: otherDept.id,
          patient_user_id: typia.random<string & tags.Format<"uuid">>(),
          full_name: RandomGenerator.name(),
          dob: new Date(1990, 0, 1).toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  const otherEncounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: otherPatientRecord.id,
        body: {
          patient_record_id: otherPatientRecord.id as string &
            tags.Format<"uuid">,
          provider_user_id: typia.random<string & tags.Format<"uuid">>(),
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  const otherLabResult =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.labResults.create(
      connection,
      {
        patientRecordId: otherPatientRecord.id,
        encounterId: otherEncounter.id,
        body: {
          ehr_encounter_id: otherEncounter.id,
          lab_integration_id: typia.random<string & tags.Format<"uuid">>(),
          test_name: "BMP",
          test_result_value_json: JSON.stringify({ Na: 139 }),
          result_flag: "normal",
          resulted_at: new Date().toISOString(),
          status: "completed",
        } satisfies IHealthcarePlatformLabResult.ICreate,
      },
    );

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "orgadminpw",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "Organization admin cannot access cross-org lab result",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.labResults.at(
        connection,
        {
          patientRecordId: otherPatientRecord.id,
          encounterId: otherEncounter.id,
          labResultId: otherLabResult.id,
        },
      );
    },
  );
}
