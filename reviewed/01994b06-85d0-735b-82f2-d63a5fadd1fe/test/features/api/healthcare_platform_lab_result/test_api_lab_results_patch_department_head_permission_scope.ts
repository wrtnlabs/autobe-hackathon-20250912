import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import type { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLabResult";

/**
 * Test department head PATCH labResults permission scope.
 *
 * 1. Register and authenticate as organization admin
 * 2. Register and authenticate department head (in-scope department)
 * 3. Register and authenticate department head (out-of-scope department)
 * 4. Create a patient record for in-scope department and another for out-of-scope
 * 5. Create an encounter for each patient record
 * 6. Provision a lab integration for the organization
 * 7. Switch to department head (valid in-scope actor)
 * 8. PATCH labResults for encounter in department (should succeed)
 * 9. Switch to out-of-scope department head
 * 10. PATCH labResults for this encounter (should error)
 */
export async function test_api_lab_results_patch_department_head_permission_scope(
  connection: api.IConnection,
) {
  // Register and authenticate org admin
  const orgAdminEmail = RandomGenerator.name(1) + "@test.org";
  const orgAdminFullName = RandomGenerator.name();
  const orgAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminEmail,
        full_name: orgAdminFullName,
        phone: RandomGenerator.mobile(),
        password: "secure123",
      },
    });
  typia.assert(orgAdmin);

  // Register department head (in-scope)
  const deptHeadEmail = RandomGenerator.name(1) + "@dept.com";
  const deptHeadName = RandomGenerator.name();
  const deptHead = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: deptHeadEmail,
      full_name: deptHeadName,
      phone: RandomGenerator.mobile(),
      password: "secureD1234",
    },
  });
  typia.assert(deptHead);

  // Register department head (out-of-scope)
  const deptHead2Email = RandomGenerator.name(1) + "@dept2.com";
  const deptHead2Name = RandomGenerator.name();
  const deptHead2 = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: deptHead2Email,
      full_name: deptHead2Name,
      phone: RandomGenerator.mobile(),
      password: "anotherDept234",
    },
  });
  typia.assert(deptHead2);

  // Re-login as org admin to ensure token is org admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "secure123",
    },
  });

  // Create patient record in department of deptHead
  const departmentId = typia.random<string & tags.Format<"uuid">>();
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const patient1: IHealthcarePlatformPatientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdmin.id,
          department_id: departmentId,
          patient_user_id: patientUserId,
          full_name: RandomGenerator.name(),
          dob: new Date().toISOString(),
          gender: "female",
          status: "active",
        },
      },
    );
  typia.assert(patient1);

  // Create patient record for another department
  const department2Id = typia.random<string & tags.Format<"uuid">>();
  const patientUser2Id = typia.random<string & tags.Format<"uuid">>();
  const patient2: IHealthcarePlatformPatientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdmin.id,
          department_id: department2Id,
          patient_user_id: patientUser2Id,
          full_name: RandomGenerator.name(),
          dob: new Date().toISOString(),
          gender: "male",
          status: "active",
        },
      },
    );
  typia.assert(patient2);

  // Create encounter for in-scope patient
  const encounter1: IHealthcarePlatformEhrEncounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patient1.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patient1.id as string & tags.Format<"uuid">,
          provider_user_id: typia.random<string & tags.Format<"uuid">>(),
          encounter_type: RandomGenerator.paragraph({ sentences: 1 }),
          encounter_start_at: new Date().toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(encounter1);

  // Create encounter for out-of-scope patient
  const encounter2: IHealthcarePlatformEhrEncounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patient2.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patient2.id as string & tags.Format<"uuid">,
          provider_user_id: typia.random<string & tags.Format<"uuid">>(),
          encounter_type: RandomGenerator.paragraph({ sentences: 1 }),
          encounter_start_at: new Date().toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(encounter2);

  // Provision lab integration for org
  const labIntegration: IHealthcarePlatformLabIntegration =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgAdmin.id as string &
            tags.Format<"uuid">,
          lab_vendor_code: RandomGenerator.alphabets(8),
          connection_uri: `https://labapi.${RandomGenerator.alphabets(6)}.com`,
          supported_message_format: "HL7 V2",
          status: "active",
        },
      },
    );
  typia.assert(labIntegration);

  // Switch to in-scope department head
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password: "secureD1234",
    },
  });

  // PATCH lab results for in-scope patient encounter (should be allowed)
  const patchRequestInScope: IHealthcarePlatformLabResult.IRequest = {
    ehr_encounter_id: encounter1.id,
    lab_integration_id: labIntegration.id,
    test_name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "revised",
    result_flag: "normal",
  };

  const inScopeResult =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.labResults.index(
      connection,
      {
        patientRecordId: patient1.id as string & tags.Format<"uuid">,
        encounterId: encounter1.id as string & tags.Format<"uuid">,
        body: patchRequestInScope,
      },
    );
  typia.assert(inScopeResult);
  TestValidator.equals(
    "PATCH for in-scope department returns lab results data",
    typeof inScopeResult.data,
    "object",
  );

  // Switch to out-of-scope department head
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHead2Email,
      password: "anotherDept234",
    },
  });

  // PATCH lab results for in-scope patient encounter (should NOT be allowed)
  await TestValidator.error(
    "PATCH labResults by out-of-scope department head is forbidden",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.labResults.index(
        connection,
        {
          patientRecordId: patient1.id as string & tags.Format<"uuid">,
          encounterId: encounter1.id as string & tags.Format<"uuid">,
          body: patchRequestInScope,
        },
      );
    },
  );
}
