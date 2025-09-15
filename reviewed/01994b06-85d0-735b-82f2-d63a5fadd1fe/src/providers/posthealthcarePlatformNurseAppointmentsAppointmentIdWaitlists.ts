import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Add a waitlist entry for a patient to a specific appointment (join waitlist).
 *
 * This endpoint enables authorized nurse staff to add a patient to the waitlist
 * of a given appointment, respecting unique constraints and business policy. It
 * fails if the patient is already waitlisted for the appointment. Fields like
 * join_time and status are handled per API defaulting logic, and audit fields
 * are set per compliance. All date values use strict string branding, and all
 * input is immutable and type-safe.
 *
 * Authorization: Only callable by authenticated nurses (role enforced by
 * decorator).
 *
 * @param props - Request properties
 * @param props.nurse - Authenticated nurse user (enforced by decorator)
 * @param props.appointmentId - The unique id of the target appointment for
 *   waitlisting
 * @param props.body - IHealthcarePlatformAppointmentWaitlist.ICreate: Includes
 *   patient_id, optional join_time and status
 * @returns The newly created appointment waitlist DTO
 * @throws {Error} If the patient is already waitlisted on the given appointment
 */
export async function posthealthcarePlatformNurseAppointmentsAppointmentIdWaitlists(props: {
  nurse: NursePayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.ICreate;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  // 1. Check for duplicate waitlist entry by (appointment_id, patient_id)
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: {
        appointment_id: props.appointmentId,
        patient_id: props.body.patient_id,
      },
    });
  if (duplicate) {
    throw new Error("Patient is already waitlisted for this appointment");
  }

  // 2. Prepare all fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const newId: string & tags.Format<"uuid"> = v4();
  // join_time: use provided value if present, else use current time
  const joinTime: string & tags.Format<"date-time"> =
    props.body.join_time !== undefined && props.body.join_time !== null
      ? props.body.join_time
      : now;
  // status: use provided status, else default 'active'
  const status: string =
    props.body.status !== undefined && props.body.status !== null
      ? props.body.status
      : "active";

  // 3. Create waitlist entry
  const created =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.create({
      data: {
        id: newId,
        appointment_id: props.appointmentId,
        patient_id: props.body.patient_id,
        join_time: joinTime,
        status,
        created_at: now,
        updated_at: now,
      },
    });

  // 4. Yield strict type-correct DTO
  return {
    id: created.id,
    appointment_id: created.appointment_id,
    patient_id: created.patient_id,
    join_time: toISOStringSafe(created.join_time),
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
