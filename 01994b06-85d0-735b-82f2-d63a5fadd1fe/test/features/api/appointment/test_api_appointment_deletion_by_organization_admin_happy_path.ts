import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Delete an appointment as an authenticated organization admin (happy path and
 * double-delete edge).
 *
 * Steps:
 *
 * 1. Register and log in an organization admin.
 * 2. Register and log in a receptionist.
 * 3. Receptionist creates a valid appointment.
 * 4. Organization admin (role switch) deletes the appointment (soft delete).
 * 5. Attempting to delete the appointment again triggers error as it is already
 *    deleted.
 */
export async function test_api_appointment_deletion_by_organization_admin_happy_path(
  connection: api.IConnection,
) {
  // 1. Register and log in an organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgAdmin);
  const orgAdminId = orgAdmin.id;
  const orgId = typia.random<string & tags.Format<"uuid">>();

  // Ensure clean login context as org admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 2. Register and log in receptionist
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistPassword = RandomGenerator.alphaNumeric(10);
  const receptionist: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.join(connection, {
      body: {
        email: receptionistEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    });
  typia.assert(receptionist);
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 3. Receptionist books a valid appointment
  const appointmentBody = {
    healthcare_platform_organization_id: orgId,
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: "in-person",
    start_time: new Date(Date.now() + 3600_000).toISOString(),
    end_time: new Date(Date.now() + 7200_000).toISOString(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment: IHealthcarePlatformAppointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: appointmentBody,
      },
    );
  typia.assert(appointment);
  const appointmentId = appointment.id;

  // 4. Switch back to organization admin role before deletion
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 5. Organization admin deletes the appointment
  await api.functional.healthcarePlatform.organizationAdmin.appointments.erase(
    connection,
    {
      appointmentId: appointmentId,
    },
  );
  // Check delete endpoint does not throw (OK if arrived here)

  // 6. Edge case: Deleting the already-deleted appointment triggers error
  await TestValidator.error("double-delete yields error", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.appointments.erase(
      connection,
      {
        appointmentId: appointmentId,
      },
    );
  });
}
