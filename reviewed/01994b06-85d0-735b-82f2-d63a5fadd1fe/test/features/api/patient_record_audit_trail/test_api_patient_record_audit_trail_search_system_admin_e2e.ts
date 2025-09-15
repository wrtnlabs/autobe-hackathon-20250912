import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import type { IHealthcarePlatformRecordAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAuditTrail";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformRecordAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRecordAuditTrail";

/**
 * End-to-end test validating advanced search and pagination of patient record
 * audit trails as system admin, including edge error scenarios.
 *
 * 1. System admin registration and login
 * 2. Create organization
 * 3. Register organization admin and login
 * 4. Create department
 * 5. Register patient
 * 6. Create patient record
 * 7. Create EHR encounter and record amendment (generates audit trails)
 * 8. [Optional] Create a second system admin for audit actor diversity
 * 9. Search audit trail records as system admin with various filters
 * 10. Validate filter correctness and handle edge/error cases
 */
export async function test_api_patient_record_audit_trail_search_system_admin_e2e(
  connection: api.IConnection,
) {
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminJoinRes = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: {
        email: sysAdminEmail,
        full_name: RandomGenerator.name(),
        provider: "local",
        provider_key: sysAdminEmail,
        password: "s3creT!@",
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    },
  );
  typia.assert(sysAdminJoinRes);
  const sysAdminId = sysAdminJoinRes.id;

  // 2. Create organization
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(2),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(org);

  // 3. Register org admin, login as org admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminJoinRes = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        provider: "local",
        provider_key: orgAdminEmail,
        password: "orgadm1n!@",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoinRes);
  // Login as org admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "orgadm1n!@",
      provider: "local",
      provider_key: orgAdminEmail,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. Create department
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id as string & tags.Format<"uuid">,
        body: {
          healthcare_platform_organization_id: org.id as string &
            tags.Format<"uuid">,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        } satisfies IHealthcarePlatformDepartment.ICreate,
      },
    );
  typia.assert(department);

  // 5. Register patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: patientEmail,
          full_name: RandomGenerator.name(),
          date_of_birth: new Date("1980-01-01T00:00:00Z").toISOString(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient);

  // 6. Create patient record
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: org.id as string,
          department_id: department.id as string,
          patient_user_id: patient.id as string,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 7. Create EHR encounter
  const providerUserId = orgAdminJoinRes.id as string & tags.Format<"uuid">;
  const encounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: providerUserId,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "completed",
          notes: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounter);

  // 8. Create record amendment - actor: org admin
  const amendment =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          submitted_by_user_id: providerUserId,
          ehr_encounter_id: encounter.id as string & tags.Format<"uuid">,
          amendment_type: "correction",
          old_value_json: JSON.stringify({ previous: "value" }),
          new_value_json: JSON.stringify({ updated: "value" }),
          rationale: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHealthcarePlatformRecordAmendment.ICreate,
      },
    );
  typia.assert(amendment);

  // --- Optionally, create a second system admin and amendment for actor diversity
  const sysAdminEmail2 = typia.random<string & tags.Format<"email">>();
  const sysAdminJoinRes2 = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: {
        email: sysAdminEmail2,
        full_name: RandomGenerator.name(),
        provider: "local",
        provider_key: sysAdminEmail2,
        password: "Adm1nPW!2",
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    },
  );
  typia.assert(sysAdminJoinRes2);
  const sysAdminActorId = sysAdminJoinRes2.id;

  // [Org admin login again in case headers changed]
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "orgadm1n!@",
      provider: "local",
      provider_key: orgAdminEmail,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  // Another amendment assigned to system admin actor (simulate external review/approval)
  await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.create(
    connection,
    {
      patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
      body: {
        patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
        submitted_by_user_id: sysAdminActorId,
        amendment_type: "regulatory",
        old_value_json: JSON.stringify({ key: "old" }),
        new_value_json: JSON.stringify({ key: "new" }),
        rationale: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHealthcarePlatformRecordAmendment.ICreate,
    },
  );

  // 9. Switch back to system admin (acting as the searcher)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password: "s3creT!@",
      provider: "local",
      provider_key: sysAdminEmail,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 10. Search audit trail by various filters
  // a) By known actor_user_id (providerUserId)
  const auditSearchActor =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAuditTrails.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          actor_user_id: providerUserId,
          limit: 100 as number & tags.Type<"int32"> & tags.Minimum<1>,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(auditSearchActor);
  TestValidator.predicate(
    "Every audit trail has the correct actor",
    auditSearchActor.data.every((a) => a.actor_user_id === providerUserId),
  );

  // b) By system admin actor (sysAdminActorId)
  const auditSearchSysAdminActor =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAuditTrails.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          actor_user_id: sysAdminActorId,
          limit: 100 as number & tags.Type<"int32"> & tags.Minimum<1>,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(auditSearchSysAdminActor);
  TestValidator.predicate(
    "Every audit trail has sysAdminActorId",
    auditSearchSysAdminActor.data.every(
      (a) => a.actor_user_id === sysAdminActorId,
    ),
  );

  // c) By action type (all actions are creation/correction/regulatory amendments)
  const auditSearchByAction =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAuditTrails.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          audit_action: "create",
          limit: 100 as number & tags.Type<"int32"> & tags.Minimum<1>,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(auditSearchByAction);

  // d) By date range (encompassing all entries, so should include all)
  const dtNow = new Date();
  const dtPast = new Date(dtNow.getTime() - 60 * 60 * 1000).toISOString();
  const dtFuture = new Date(dtNow.getTime() + 60 * 60 * 1000).toISOString();
  const auditSearchByDate =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAuditTrails.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          created_from: dtPast,
          created_to: dtFuture,
          limit: 100 as number & tags.Type<"int32"> & tags.Minimum<1>,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(auditSearchByDate);
  TestValidator.predicate(
    "All returned audit entries are within date range",
    auditSearchByDate.data.every(
      (a) => a.created_at >= dtPast && a.created_at <= dtFuture,
    ),
  );

  // 11. Pagination sanity
  TestValidator.predicate(
    "pagination record count matches data count",
    auditSearchByDate.pagination.records >= auditSearchByDate.data.length,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    auditSearchByDate.pagination.current === 1,
  );

  // 12. Edge Cases
  // a) Non-existent patientRecordId (should not find anything or 404)
  const randomPatientRecordId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Searching audit trails with invalid patientRecordId should throw error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAuditTrails.index(
        connection,
        {
          patientRecordId: randomPatientRecordId,
          body: {
            limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          },
        },
      );
    },
  );
  // b) Filter by random/fake actor_user_id, should return empty
  const auditFakeActor =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAuditTrails.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          actor_user_id: typia.random<string & tags.Format<"uuid">>(),
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(auditFakeActor);
  TestValidator.equals(
    "Expected empty record for fake actor",
    auditFakeActor.data.length,
    0,
  );

  // c) Filter by non-existent action type, should return empty
  const auditFakeAction =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAuditTrails.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          audit_action: RandomGenerator.alphaNumeric(12),
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(auditFakeAction);
  TestValidator.equals(
    "Expected empty record for non-existent audit_action",
    auditFakeAction.data.length,
    0,
  );
}
