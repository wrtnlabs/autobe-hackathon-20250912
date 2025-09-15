import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformPatientRecord";

/**
 * Workflow: Department head can search for patient records within their
 * organization and department. Authentication is required. The test creates
 * a department head, logs in, and attempts to search patient records using
 * organization_id that the department head belongs to. It also attempts to
 * search outside their boundaries and verifies no access is granted.
 */
export async function test_api_patient_record_update_by_department_head_workflow(
  connection: api.IConnection,
) {
  // 1. Register a new department head
  const joinReq = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(10),
    phone: RandomGenerator.mobile(),
    sso_provider: null,
    sso_provider_key: null,
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const deptHead = await api.functional.auth.departmentHead.join(connection, {
    body: joinReq,
  });
  typia.assert(deptHead);

  // 2. Log in as department head
  const loginReq = {
    email: joinReq.email,
    password: joinReq.password,
    sso_provider: null,
    sso_provider_key: null,
  } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest;
  const loginResult = await api.functional.auth.departmentHead.login(
    connection,
    { body: loginReq },
  );
  typia.assert(loginResult);

  // 3. Search for patient records within authorized organization_id (should succeed)
  const searchAuthorized =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.index(
      connection,
      {
        body: {
          organization_id: deptHead.id, // Simulate as the organization that the department head leads
        } satisfies IHealthcarePlatformPatientRecord.IRequest,
      },
    );
  typia.assert(searchAuthorized);
  TestValidator.predicate(
    "patient records fetched are authorized for the organization",
    searchAuthorized.data.every((rec) => rec.organization_id === deptHead.id),
  );

  // 4. Search for patient records with a random invalid organization_id (should not return data)
  const randomOrgId = typia.random<string & tags.Format<"uuid">>();
  const searchInvalidOrg =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.index(
      connection,
      {
        body: {
          organization_id: randomOrgId,
        } satisfies IHealthcarePlatformPatientRecord.IRequest,
      },
    );
  typia.assert(searchInvalidOrg);
  TestValidator.predicate(
    "no patient records fetched for invalid org",
    searchInvalidOrg.data.length === 0,
  );

  // 5. Search with missing department_id (should still allow, but results should all match organization_id)
  const searchNoDept =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.index(
      connection,
      {
        body: {
          organization_id: deptHead.id,
          department_id: undefined,
        } satisfies IHealthcarePlatformPatientRecord.IRequest,
      },
    );
  typia.assert(searchNoDept);
  TestValidator.predicate(
    "all fetched patient records organization_id matches requested org",
    searchNoDept.data.every((rec) => rec.organization_id === deptHead.id),
  );
}
